# AGENTS.md

## Project Snapshot

This project is a way for users to interact with their current file system with more data. Getting the context of files and folders is the pivotal piece which then allows for better searching, linking files together by relevancy and better organization of files and folders.

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (file failed to get context, folder failed to read, partial success of getting context for files in a folder).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there are shared logic that can be extracted to a separate module. Duplicate logic across mulitple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.



## Knowledge Base

The role of this section is to describe common mistakes and confusion points that agent might encounter as they work in this project. If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the cause in the agent MD file to help prevent further agents from having the same issue.
