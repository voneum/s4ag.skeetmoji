import { BSkyApi_Embed } from "./BSkyApi_Embed";
import { BSkyApi_Reply } from "./BSkyApi_Reply";

/**
 * Record object representing the data being created or modified.
 */
export class BSkyApi_Record {
  public Type: string; // The type of the record
  public CreatedAt: string; // Creation timestamp (ISO 8601 format)
  public Langs?: string[]; // List of languages used
  public Reply?: BSkyApi_Reply; // Optional reply object
  public Text: string; // The content text
  public Embed?: BSkyApi_Embed; // Optional embedded object

  constructor(json: any) {
    this.Type = json.$type;
    this.CreatedAt = json.createdAt;
    this.Langs = json.langs ?? undefined;
    this.Reply = json.reply ? new BSkyApi_Reply(json.reply) : undefined;
    this.Text = json.text;
    this.Embed = json.embed ? new BSkyApi_Embed(json.embed) : undefined;
  }
}