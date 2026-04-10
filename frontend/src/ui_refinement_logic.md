# UI Refinement Logic - AuthModal

## Objective

Address user feedback regarding the AuthModal while strictly adhering to the "don't over-calculate" rule.

## User Feedback

1. Header "系统登录" is too big and should be English.
2. Input fields (Email/Password) are not centered.
3. No vertical spacing between input fields.
4. Revert style changes that weren't explicitly requested (stick to the original terminal look).

## Implementation Plan

1. **Width**: Significantly increase form width to `max-w-[520px]` to fill the modal space better and feel more balanced.
2. **Absolute Centering**:
   - Ensure `text-center` is on every input and label.
   - Use `w-full` on all children of the `mx-auto` form.
   - Double-check that no `pl-` or `pr-` is pushing content off-center.
3. **Lines**: Keep the horizontal line theme but ensure it spans the full `520px` width.
