import { BSkyApi_PostResponse } from "./BSkyApi_PostResponse";

export class JetstreamDetail{

    /**
     *
     */
    constructor(public PostResponse:BSkyApi_PostResponse, public DataLength: number, public MessageCount: number) {
        
    }
}