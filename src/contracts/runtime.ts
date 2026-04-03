export interface ModelAdapterRequest {
  actorRole: "planner";
  actorId: string;
  objective: string;
  schemaName: string;
  schemaDescription: string;
  instructions: string;
  repairContext: string | null;
  attempt: number;
}

export interface SharedModelAdapter {
  name: string;
  invokeStructured(request: ModelAdapterRequest): unknown;
}

