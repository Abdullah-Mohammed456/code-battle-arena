"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import AsciiHeroImage from "./AsciiHeroImage";
import logoImg from "../../public/logo.jpg";

import {
  TestCase,
  ExecuteCodeResponse,
  TestResultStatus,
} from "../types/execution.type";

const DEFAULT_CODE = `#include <iostream>
using namespace std;

int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << a + b << '\n';
    }
    return 0;
}
`;

const INITIAL_TEST_CASES: TestCase[] = [
  { id: "1", input: "3 5", expectedOutput: "8" },
  { id: "2", input: "10 20", expectedOutput: "30" },
  { id: "3", input: "2 2", expectedOutput: "4" },
];

const PROBLEM_STATEMENT = `The user takes two variables as inputs and print the summation`;

export default function CodeArena() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [testCases] = useState<TestCase[]>(INITIAL_TEST_CASES);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<ExecuteCodeResponse | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("http://localhost:3001/api/execution/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, testCases }),
      });

      if (!res.ok) throw new Error(`Server status: ${res.status}`);
      const data: ExecuteCodeResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      console.error("Execution error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: TestResultStatus) => {
    switch (status) {
      case "AC":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "WA":
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
      case "TLE":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      default:
        return "text-pink-400 bg-pink-500/10 border-pink-500/30";
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#0a0a0c] text-zinc-100 p-6 gap-5 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Ascii Photo Background Effect */}
      <AsciiHeroImage imageSrc={logoImg.src} />

      {/* Top Navbar Header (Originkit Style) */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-zinc-950/70 border border-white/10 rounded-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-6">
          <span className="text-xl font-black tracking-widest text-white uppercase">
            DEBLOT{" "}
            <span className="text-xs font-normal text-zinc-500">/ ARENA</span>
          </span>
          <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400 font-mono">
            <span className="hover:text-white cursor-pointer transition-colors">
              / PROTOCOL
            </span>
            <span className="hover:text-white cursor-pointer transition-colors">
              / DEVELOPERS
            </span>
            <span className="hover:text-white cursor-pointer transition-colors">
              / INTEGRATIONS
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={loading}
            className="px-6 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Compiling..." : "Run Solution"}
          </button>
        </div>
      </header>

      {/* Main Content Arena */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 overflow-hidden">
        {/* Monaco Editor Container */}
        <div className="border border-white/10 rounded-2xl overflow-hidden flex flex-col bg-zinc-950/25 backdrop-blur-xl shadow-2xl">
          <div className="bg-zinc-900/40 px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="text-zinc-300 font-bold">solution.cpp</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[11px]">
              C++ 20
            </span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="cpp"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 14,
                fontFamily: "Fira Code, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
              }}
            />
          </div>
        </div>

        {/* Results / Test Cases Panel */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {response && (
            <div
              className={`p-5 border rounded-2xl flex items-center justify-between backdrop-blur-xl ${getStatusBadge(
                response.overallStatus,
              )}`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 block">
                  Verdict
                </span>
                <span className="text-3xl font-black">
                  {response.overallStatus}
                </span>
              </div>
              <div className="text-right font-mono text-sm">
                Passed: {response.passedCount} / {response.totalCount}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">
              {PROBLEM_STATEMENT}
            </h2>
            {testCases.map((tc, index) => {
              const res = response?.results.find((r) => r.testCaseId === tc.id);
              return (
                <div
                  key={tc.id}
                  className="bg-zinc-950/25 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-xl hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-bold">
                      Case #{index + 1}
                    </span>
                    {res && (
                      <span
                        className={`px-2.5 py-0.5 rounded border text-[11px] font-bold ${getStatusBadge(res.status)}`}
                      >
                        {res.status}{" "}
                        {res.executionTimeMs
                          ? `(${res.executionTimeMs}ms)`
                          : ""}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] block mb-1">
                        Input
                      </span>
                      <code className="text-zinc-200">{tc.input}</code>
                    </div>
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                      <span className="text-zinc-500 text-[10px] block mb-1">
                        Expected Output
                      </span>
                      <code className="text-zinc-200">{tc.expectedOutput}</code>
                    </div>
                  </div>

                  {res?.actualOutput !== undefined && (
                    <div className="bg-black/50 p-3 rounded-xl border border-white/5 text-xs font-mono">
                      <span className="text-zinc-500 text-[10px] block mb-1">
                        Actual Output
                      </span>
                      <code className="text-cyan-400 font-bold">
                        {res.actualOutput}
                      </code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
