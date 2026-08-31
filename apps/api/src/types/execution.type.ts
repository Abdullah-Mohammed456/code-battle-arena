export interface ExecuteCodeRequest {
  code: string;
  input?: string;
}
export interface ExecuteCodeResponse {
  status: "success" | "error";
  output?: string;
  message?: string;
  details?: string;
}
