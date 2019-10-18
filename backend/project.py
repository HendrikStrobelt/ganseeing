import base64
import re
from io import BytesIO

import PIL
import torch
import copy
from PIL import Image

from seeing import nethook, setting, show, renormalize, zdataset, pbar, segviz
from seeing import encoder_net
from seeing import imgviz, segmenter
from torchvision import models, transforms
from torch.nn.functional import mse_loss, l1_loss

# from gand import imagedata, subsequence


def img_to_base64(imgarray, for_html=True, image_format='png'):
    """
    Converts a numpy array to a jpeg base64 url
    """
    input_image_buff = BytesIO()
    Image.fromarray(imgarray).save(input_image_buff, image_format,
                                   quality=99, optimize=True, progressive=True)
    res = base64.b64encode(input_image_buff.getvalue()).decode('ascii')
    if for_html:
        return 'data:image/' + image_format + ';base64,' + res
    else:
        return res


def base64_to_pil(string_data):
    string_data = re.sub('^(?:data:)?image/\\w+;base64,', '', string_data)
    return Image.open(BytesIO(base64.b64decode(string_data)))


def pil_to_base64(img):
    input_image_buff = BytesIO()
    img.save(input_image_buff, 'png',
             quality=99, optimize=True, progressive=True)
    return 'data:image/png;base64,' + base64. \
        b64encode(input_image_buff.getvalue()).decode('ascii')


class InverterProject:

    def __init__(self, id):
        self.use_cuda = torch.cuda.is_available()
        self.id = id

    def invert_generate(self, image_str):
        return None

    def generate(self, id):
        return None


class SeeInverter(InverterProject):
    def __init__(self, model):
        InverterProject.__init__(self, model)
        self.model = model
        self.optimize_over = ['layer1', 'layer2', 'layer3']
        self.layernums = [name.replace('layer', '')
                          for name in self.optimize_over]
        # Load a GAN generator, a trained encoder, and a pretrained VGG.
        self.unwrapped_G = setting.load_proggan(model)
        print('g loaded')
        self.E = setting.load_proggan_inversion(model)
        print('e loaded')
        self.vgg = models.vgg16(pretrained=True)
        print('vgg loaded')
        self.VF = nethook.subsequence(self.vgg.features, last_layer='20')
        self.upp = segmenter.UnifiedParsingSegmenter()
        print('seg loaded')
        self.iv = imgviz.ImageVisualizer(256)
        # Move models and data to GPU
        if self.use_cuda:
            for m in [self.unwrapped_G, self.E, self.VF]:
                m.cuda()

    def invert_generate(self, image_str):
        pil_img = base64_to_pil(image_str) #type: PIL.Image
        pil_img = transforms.functional.center_crop(
            transforms.functional.resize(pil_img, 256), 256)
        # scale !!

        pt_img = renormalize.from_image(pil_img)
        target_x = pt_img[None, :, :, :]
        if self.use_cuda:
            target_x = target_x.cuda()
        # Some constants
        num_steps = 50
        # show_every=500,
        lr = 0.01
        milestones = [250, 500]
        with torch.no_grad():
            init_z = self.E(target_x)
            target_v = self.VF(target_x)

        # Wrap the GAN in an instrumented model that adds residuals at the requested layer
        G = encoder_net.ResidualGenerator(
            copy.deepcopy(self.unwrapped_G), init_z, self.optimize_over)
        parameters = list(G.parameters(recurse=False))

        # We only need grad over the top-level residual parameters in G.
        nethook.set_requires_grad(False, G, self.E)
        nethook.set_requires_grad(True, *parameters)
        optimizer = torch.optim.Adam(parameters, lr=lr)
        # scheduler = torch.optim.lr_scheduler.MultiStepLR(
        #     optimizer, milestones=milestones, gamma=0.5)

        with torch.enable_grad():
            for step_num in range(num_steps + 1):
                current_x = G()
                loss_x = l1_loss(target_x, current_x)
                loss_v = mse_loss(target_v, self.VF(current_x))
                loss_d = sum(getattr(G, 'd%s' % n).pow(2).mean()
                             for n in self.layernums)
                loss = loss_x + loss_v + loss_d
                optimizer.zero_grad()
                loss.backward()
                if step_num > 0:
                    optimizer.step()

        orig_seg = self.upp.segment_batch(target_x.cuda())[0, 0:1]
        reconst_seg = self.upp.segment_batch(current_x.cuda())[0, 0:1]

        print(orig_seg)
        legend_list = self.iv.segment_key(torch.cat([orig_seg, reconst_seg]), self.upp)
        return {
            'input_i': renormalize.as_url(target_x[0]),
            'output_i': renormalize.as_url(current_x[0]),
            'input_seg':pil_to_base64(self.iv.segmentation(orig_seg)),
            'output_seg':pil_to_base64(self.iv.segmentation(reconst_seg)),
            # 'legend': [{"color":pil_to_base64(x[0]), "name":x[1]} for x in legend_list]
            'legend_colors': self.segment_key(torch.cat([orig_seg, reconst_seg]),10)
            # 'legend': pil_to_base64(self.iv.segment_key(torch.cat([orig_seg, reconst_seg]), self.upp))
        }


    def segment_key(self, seg,  max_labels=6):
        seglabels, _ = self.upp.get_label_and_category_names()
        bc = torch.bincount(seg.view(-1)).cpu()
        result = []
        for ind in bc.sort()[1].flip(0):
            if len(result) >= max_labels or bc[ind].item() == 0:
                break
            print(bc.shape, bc[ind])
            result.append((segviz.high_contrast[ind % len(segviz.high_contrast)], seglabels[ind][0], bc[ind].item()))
        return result

    def generate(self, id):
        pass


class GanDissInverter(InverterProject):

    def __init__(self, dataset):
        InverterProject.__init__(self, 'gand_' + dataset)
        self.ds = dataset
        self.inverter = None
        self.fwd = None

    def invert_generate(self, image_str):
        pil_img = base64_to_pil(image_str)
        # scale !!

        # pt_img = renormalize.as_tensor(pil_img)
        # print(pt_img)

        # pt_img = imagedata.tensor_from_pil(pil_img)  # type: torch.Tensor

        # # lazy loading
        # if not self.inverter:
        #     self.inverter = imagedata.load_hybrid_inverter(self.ds,
        #                                                    self.use_cuda)
        # if not self.fwd:
        #     self.fwd = imagedata.load_generator(self.ds, self.use_cuda)

        # print(pt_img.shape, type(pt_img),type(self.inverter))

        # if self.use_cuda:
        #     z = self.inverter(pt_img.cuda())
        #     y = self.fwd(z)
        # else:
        #     z = self.inverter(pt_img)  # type: torch.Tensor
        #     y = self.fwd(z)

        return {
            # 'input_t': pt_img.cpu(),
            # 'z': z.tolist(),
            # 'output_t': y.cpu()
        }

    def generate(self, id):
        pass
        # if not self.fwd:
        #     self.fwd = imagedata.load_generator(self.ds, self.use_cuda)

        # self.fwd
