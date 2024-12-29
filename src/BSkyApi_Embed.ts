import { BSkyApi_VideoBlob } from "./BSkyApi_VideoBlob";

export class BSkyApi_Embed {
    public Type: string; // Embed type (e.g., "app.bsky.embed.video")
    public Video?: BSkyApi_VideoBlob; // Optional video blob details
  
    constructor(json: any) {
      this.Type = json.$type;
      this.Video = json.video ? new BSkyApi_VideoBlob(json.video) : undefined;
    }
  }
  