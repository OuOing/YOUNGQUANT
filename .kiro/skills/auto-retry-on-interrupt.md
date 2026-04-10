# Auto Retry on Interrupt

When a task is interrupted or stops unexpectedly mid-execution:

1. **Identify what was completed** — review the last successful action in the conversation
2. **Identify what remains** — determine the remaining steps from the original task
3. **Resume immediately** — continue from where it stopped without asking the user
4. **Do not repeat completed work** — skip already-done steps

Apply this to all multi-step tasks: code changes, file creation, analysis, refactoring.
