import * as d3 from 'd3'
import "d3-selection-multi";

import '../css/main.scss'
import "!file-loader?name=index.html!../index.html";
// import "!file-loader?name=mitibm_heart.png!../demo/mitibm_heart.png";
// import "!file-loader?name=overview.png!../demo/overview.png";
// import "!file-loader?name=brush.svg!../fonts/icons/brush.svg";
// import "!file-loader?name=logo_inv.svg!../fonts/icons/logo_inv.svg";
// import "bootstrap/js/dist/index"
import {SimpleEventHandler} from "./etc/SimpleEventHandler";
import {
    SeeingAPI
} from "./api/SeeingAPI";
import URLHandler from "./etc/URLHandler";

import {Icons} from "./icons/icons";


const current = {};


const demo = {}


window.onload = () => {


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


    d3.select('#upload_img').on('change', function () {
        const me = <HTMLInputElement>this;
        console.log(this, "--- this");
        console.log(me.files, "--- me.files");


        if (me.files && me.files[0]) {

            d3.select('#upload_img').style('display', 'none');
            d3.select('#uploading_img').style('display', null);

            const reader = new FileReader();

            reader.onload = e => {
                console.log(e, "--- e");
                // @ts-ignore
                console.log(e.target.result, "--- e.target.result");

                // @ts-ignore
                api.uploadImage(project, e.target.result)
                    .then(res => {
                        // current.samples.unshift(res);
                        // updateSampleList();
                        // saveSamples();
                        //
                        console.log(res, "--- res");

                        d3.selectAll('.results').classed('hidden', false);

                        Object.keys(res.res).map(key =>{
                            if (!key.startsWith('label')){
                                d3.select('#'+key)
                                    .attr('src', res.res[key])

                            }
                        })

                        const statRows = d3.select('#stats')
                            .selectAll('.statRow').data(res.res.legend_colors)
                            .join(enter =>{
                                const row = enter.append('div')
                                row.append('div')
                                    .attr('class','colorBox')
                                    .style('display','inline-block')
                                    .style('width','10px')
                                    .style('height','10px')

                                row.append('span').attr('class','textBox')
                                return row
                            })
                            .attr('class','statRow')

                        // @ts-ignore
                        statRows.select('.colorBox').style('background-color', d => d3.rgb(...d[0]))

                        statRows.select('.textBox').text(d => `${d[1]} (${d[2]})`);




                        d3.select('#upload_img').style('display', null);
                        d3.select('#uploading_img').style('display', 'none');

                    });


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




