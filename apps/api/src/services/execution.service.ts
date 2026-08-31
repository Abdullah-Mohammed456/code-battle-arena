import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

export const executeCppCode = async (
  code: string,
  input: string,
): Promise<string> => {
  const filePath = path.join(process.cwd(), "temp_solution.cpp");
  const outputPath = path.join(process.cwd(), "temp_output");

  try {
    fs.writeFileSync(filePath, code);

    await execPromise(`g++ ${filePath} -o ${outputPath}`);

    const { stdout } = await execPromise(`echo "${input}" | ${outputPath}`);

    return stdout.trim();
  } catch (error: any) {
    throw new Error(error.stderr || error.message);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
};
