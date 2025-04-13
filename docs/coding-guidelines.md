# Engineering Code Guidelines

- **Prefer Simplicity**  
  Always choose the simplest solution that meets the requirement.

- **Avoid Code Duplication**  
  Reuse existing functionality where possible. Check the codebase for similar code before writing new logic.

- **Environment Awareness**  
  Ensure your code considers the different environments: `dev`, `test`, and `prod`.

- **Stick to the Scope**  
  Only make changes that are requested or clearly related and well understood in the context of the task.

- **Preserve Existing Patterns**  
  When fixing bugs or issues, avoid introducing new patterns or technologies unless all options with the current implementation have been exhausted. If a new pattern is introduced, remove any old and now-redundant logic to prevent duplication.

- **Keep Code Clean and Organized**  
  Maintain a tidy and logical structure throughout the codebase.

- **Avoid Temporary Scripts in Files**  
  Do not write one-off scripts in permanent files.

- **Refactor Large Files**  
  Avoid files larger than 200–300 lines of code. Refactor to maintain clarity and separation of concerns.

- **Testing Data Usage**  
  Mock data should only be used in tests — never in development or production code.

- **No Fake Data in Dev/Prod**  
  Do not introduce fake or stubbed data in environments outside of tests.

- **Respect `.env` Files**  
  Never overwrite someone else’s `.env` file without explicit permission.

- **Stay Focused**  
  Focus only on code relevant to the task. Do not modify unrelated functionality.

- **Write Thorough Tests**  
  Ensure major functionality is well covered with automated tests.

- **Avoid Unnecessary Architectural Changes**  
  Do not make major changes to proven patterns or architectures unless explicitly instructed.

- **Consider Broader Impact**  
  Always think through what other methods or areas of the code might be affected by your changes.

- **Ask before making changes**  
Always wait until I give clear instructions before changing or building. Sometimes I want to have a conversation with you and understand the options before jumping and changing the code or implementing new code.