import { BSkyApi_Record } from "./BSkyApi_Record";

/**
 * Commit object containing details about the specific event.
 */
export class BSkyApi_Commit {
  public Rev: string; // Revision ID
  public Operation: string; // Operation type (e.g., "create")
  public Collection: string; // Collection name (e.g., "app.bsky.feed.post")
  public RKey: string; // Record key
  public Record?: BSkyApi_Record; // Record object with the event details
  public Cid?: string; // Content ID
  public Type: string; // Type of the commit (e.g., "c")

  constructor(json: any) {
    this.Rev = json.rev;
    this.Type = json.type;
    this.Operation = json.operation;
    this.Collection = json.collection;
    this.RKey = json.rkey;

    if (this.Operation !== "delete"){
      this.Record = new BSkyApi_Record(json.record);
      this.Cid = json.cid;
    }
  }
}
