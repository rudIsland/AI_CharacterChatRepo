# QA Stage 1 Guide

## Structure
- Static check: use TypeScript type checks for `web` and `mobile`, and Python compile checks for `server`.
- Function test: verify that the core server API contracts still work.
- Core scenario regression test: lock the main user flow, `create session -> send message -> reload session and messages`.

## Why This Shape
- The FastAPI server owns the main data flow, so server-first QA gives the best coverage for the current project.
- Both clients depend on the same API, so type checks plus server regression tests are a good low-cost starting point.
- External AI calls are stubbed in regression tests, which keeps the checks fast, deterministic, and free to run.

## Run Order
1. Static check
2. Function test
3. Core scenario regression test

## Run All
```powershell
.\scripts\run-qa-stage1.cmd
```

## Run Each Step

### Static Check
```powershell
Set-Location apps\client\web
npm.cmd run typecheck

Set-Location ..\mobile
npm.cmd run typecheck

Set-Location ..\..\server
py -m compileall app tests
```

### Function Test
```powershell
Set-Location apps\server
py -m unittest tests.test_system_api_function
```

### Core Scenario Regression Test
```powershell
Set-Location apps\server
py -m unittest tests.test_chat_api_regression
```

## Pass Criteria
- Static checks must finish without errors.
- Function tests must keep the base system, character, and chat session API contracts intact.
- Regression tests must keep the `create session -> store message -> store reply -> reload history` flow intact.
