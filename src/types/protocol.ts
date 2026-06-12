export type ServerMode = "normal" | "chaos";

export interface TokenMessage {
  type: "TOKEN";
  seq: number;
  text: string;
  stream_id: string;
}

export interface ToolCallMessage {
  type: "TOOL_CALL";
  call_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  stream_id: string;
  seq: number;
}

export interface ToolResultMessage {
  type: "TOOL_RESULT";
  call_id: string;
  result: Record<string, unknown>;
  stream_id: string;
  seq: number;
}

export interface ContextSnapshotMessage {
  type: "CONTEXT_SNAPSHOT";
  context_id: string;
  data: Record<string, unknown>;
  seq: number;
}

export interface PingMessage {
  type: "PING";
  challenge: string;
  seq: number;
}

export interface StreamEndMessage {
  type: "STREAM_END";
  stream_id: string;
  seq: number;
}

export interface ErrorMessage {
  type: "ERROR";
  code: string;
  message: string;
  seq: number;
}

export type ServerMessage =
  | TokenMessage
  | ToolCallMessage
  | ToolResultMessage
  | ContextSnapshotMessage
  | PingMessage
  | StreamEndMessage
  | ErrorMessage;

export type ClientMessage =
  | { type: "USER_MESSAGE"; content: string }
  | { type: "PONG"; echo: string }
  | { type: "RESUME"; last_seq: number }
  | { type: "TOOL_ACK"; call_id: string };