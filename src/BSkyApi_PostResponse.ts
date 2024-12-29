import { BSkyApi_Commit } from "./BSkyApi_Commit";

export class BSkyApi_PostResponse {
  public Did: string; // Decentralized Identifier
  public TimeUs: number; // Timestamp in microseconds
  public Kind: string; // The kind of event (e.g., "commit")
  public Type: string; // The type (e.g., "com")
  public Commit?: BSkyApi_Commit; // The commit object containing event details

  constructor(json: any) {
    this.Did = json.did;
    this.TimeUs = json.time_us;
    this.Kind = json.kind;
    this.Type = json.type;

    if (this.Kind === "commit")
      this.Commit = json.commit ? new BSkyApi_Commit(json.commit) : undefined;
  }
}
