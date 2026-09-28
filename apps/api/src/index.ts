import express from "express";
import cors from "cors";
import router from "./routes/execution.route";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());
app.use("/api/execution", router);

app.listen(PORT, () => {
  console.log(`the api is running on http://localhost:${PORT}`);
});
