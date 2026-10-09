import { expect, test } from "bun:test";
import { executeCppCode } from "../../src/services/execution.service.js";

test.skipIf(process.env.RUN_DOCKER_TESTS !== "1")(
  "real Docker preserves compile and per-test judging",
  async () => {
    const result = await executeCppCode(
      "#include <iostream>\nint main(){ int a,b; std::cin>>a>>b; std::cout<<a+b; }",
      [
        { id: "1", input: "3 5", expectedOutput: "8" },
        { id: "2", input: "2 3", expectedOutput: "6" },
      ],
    );
    expect(result.overallStatus).toBe("WA");
    expect(result.passedCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.results.map((entry) => entry.status)).toEqual(["AC", "WA"]);
    expect(result.results[0]?.actualOutput).toBe("8");
  },
  20000,
);
