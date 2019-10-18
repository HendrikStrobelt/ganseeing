/*
Ganter API and Types
 */

import * as d3 from "d3";
import URLHandler from "../etc/URLHandler";


export type API_Project = {
    project: string
}

export type API_AllProject = API_Project[]

export type API_generate_req = {
    project: string,
    ids: string[],
    save: boolean,
    interventions: API_Intervention[],
    interpolations: number[]
}

export type API_generate = {
    request: API_generate_req
    res: { d: string, id?: string }[]
}


export type API_Intervention = {
    value_mask: string,
    feature: string,
    strength: number,
    erase: boolean
}

export type API_Upload = {
    req: {
        project: string
    },
    res: {
        input_i: string,
        output_i: string,
        input_seg: string,
        output_seg: string,
        legend_colors: [number[], string, number][] // rgb-color, name, count
    }
}


export class SeeingAPI {


    constructor(private baseURL: string = null) {
        if (this.baseURL == null) {
            this.baseURL = '..';
        }
    }


    allProjects(): Promise<API_AllProject> {
        return d3.json(this.baseURL + '/api/all_projects')
    }


    uploadImage(
        project: string,
        image: string
    ): Promise<API_Upload> {
        const payload = {
            // "ablations": ablations,
            project,
            image
        };


        return d3.json(this.baseURL + '/api/upload', {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
    }


}

