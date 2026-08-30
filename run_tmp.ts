import { parseModelResponse } from "./server/app-a/daily-reset/parseModelResponse";
import { fixValidPlanResponse } from "./server/app-a/daily-reset/fixtures";
let idCounter = 0;
const idFactory = () => `server_id_${++idCounter}`;
console.log(JSON.stringify(parseModelResponse(fixValidPlanResponse, idFactory, false), null, 2));
