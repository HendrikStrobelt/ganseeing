import * as d3 from 'd3'
import "d3-selection-multi";

import '../css/main.scss'
import "!file-loader?name=index.html!../index.html";
// import "!file-loader?name=mitibm_heart.png!../demo/mitibm_heart.png";
// import "!file-loader?name=overview.png!../demo/overview.png";
// import "!file-loader?name=brush.svg!../fonts/icons/brush.svg";
// import "!file-loader?name=logo_inv.svg!../fonts/icons/logo_inv.svg";
// import "bootstrap/js/dist/index"
import { SimpleEventHandler } from "./etc/SimpleEventHandler";
import {
    SeeingAPI
} from "./api/SeeingAPI";
import URLHandler from "./etc/URLHandler";

import { Icons } from "./icons/icons";
import * as _ from 'lodash';


const current = {};


const demo = {}


window.onload = () => {
    const demo_data = {
        "80_target": false,
        "10_target": false,
        "96_target": false,
        "111_target": false,
        "457_target": true,
        "264_target": true,
        "569_target": true,
        "82_target": true,
        "church_54_target": true,
        "church_903_target": true,
        "883_target": true,
        "390_target": true,
        "921_target": true,
        "906_target": true
    }




    d3.select('#examples').selectAll('.xmpl').data(Object.keys(demo_data).map(k => ({name:k, is_real:demo_data[k]})))
        .join('img')
        .attr('class', 'xmpl')
        .attr('src', d => `demo/${d.name}.png.100.png`)
        .classed('real_img', d => d.is_real)
        // .text(d => `example ${d}`)
        // .attr('href', '')
        .on('click', d => {
            d3.json(`demo/${d.name}.json`)
                .then(dd => update_view(dd))
        })


    d3.select('#back').on('click', () => {
        window.open('http://ganseeing.csail.mit.edu')
    })


    // START with demo 0
    d3.json(`demo/80_target.json`)
        .then(dd => update_view(dd))
    /*
    *
    * variables and static selections
    *
    * */

    const eventHandler = new SimpleEventHandler(<Element>d3.select('body').node());


    const api_prefix = URLHandler.parameters['api'] || '..';
    const project = URLHandler.parameters['project'] || 'church';
    const api = new SeeingAPI(api_prefix);


    // restoreSamples();
    updateSampleList();


    /*
    *
    * Accessors
    *
    * */

    function updateSampleList() {


    }


    /*
     *
     *  ===== EVENTS ====
     *
     */


    const update_view = res => {
        // current.samples.unshift(res);
        // updateSampleList();
        // saveSamples();
        //
        console.log('RES:')
        console.log(res);

        d3.selectAll('.results').classed('hidden', false);

        Object.keys(res.res).map(key => {
            if (!key.startsWith('label')) {
                d3.select('#' + key)
                    .attr('src', res.res[key])

            }
        })

        const statRows = d3.select('#stats')
            .selectAll('.statRow').data(res.res.legend_colors)
            .join(enter => {
                const row = enter.append('div')
                row.append('div')
                    .attr('class', 'colorBox')
                    .style('display', 'inline-block')
                    .style('width', '10px')
                    .style('height', '10px')

                row.append('span').attr('class', 'textBox')
                return row
            })
            .attr('class', 'statRow')

        // @ts-ignore
        statRows.select('.colorBox').style('background-color', d => d3.rgb(...d[0]))

        statRows.select('.textBox').text(d => `${d[1]} (${d[2]})`);




        d3.selectAll('.hide_while_up').style('display', null);
        d3.select('#uploading_img').style('display', 'none');

    }


    const upload_image = img => {
        d3.selectAll('.results').classed('hidden', true);

        // @ts-ignore
        api.uploadImage(project, img)
            .then(update_view);
    }


    const shrink_and_upload = src_img => {
        const img = new Image();
        img.src = src_img;



        img.onload = () => {
            const max_dim = img.width > img.height ? img.width : img.height;
            const factor = 512.0 / max_dim;
            const width = Math.floor(img.width * factor);
            const height = Math.floor(img.height * factor);

            console.log(width, height)

            const elem = document.createElement('canvas');
            elem.width = width;
            elem.height = height;
            const ctx = elem.getContext('2d');
            // img.width and img.height will contain the original dimensions
            ctx.drawImage(img, 0, 0, width, height);
            const blobb = ctx.canvas.toDataURL('image/png');
            upload_image(blobb);


        }
    }


    d3.select('#upload_img').on('change', function () {
        const me = <HTMLInputElement>this;
        console.log(this, "--- this");
        console.log(me.files, "--- me.files");


        if (me.files && me.files[0]) {

            d3.selectAll('.hide_while_up').style('display', 'none');
            d3.select('#uploading_img').style('display', null);

            const reader = new FileReader();

            reader.onload = e => {
                // console.log(e, "--- e");
                // // @ts-ignore
                // console.log(e.target.result, "--- e.target.result");


                console.log(e.target.result)
                shrink_and_upload(e.target.result);




            }

            reader.readAsDataURL(me.files[0]);
            d3.select('#upload_img').property('value', '');


        }

    })


    // d3.select('#img_download').on('click', function () {
    //     let image = <string>ganPaintView.canvas.node().toDataURL("image/png");
    //     (<HTMLLinkElement>this).href = image;
    // })

    /*
    *
    *  ===== UI stuff ====
    *
     */

    function setup_ui() {


        window.onresize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            re_layout(w, h);
        };

        function re_layout(w = window.innerWidth, h = window.innerHeight) {
            d3.selectAll('.main_frame')
                .style('height', (h - 53) + 'px')
                .style('width', w + 'px')
        }

        re_layout(window.innerWidth, window.innerHeight);

    }

    setup_ui();


}




