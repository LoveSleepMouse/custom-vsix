import * as configuration from "./configuration";
import promptTypes, {
  PROMPT_TYPES,
  Prompt,
  PromptStatus,
} from "./prompts/prompt-types";
import {
  CommitMessage,
  serializeSubject,
  serializeHeader,
} from "./commit-message";
import commitlint from "./commitlint";
import { QuickInputButtons } from "vscode";
import { gitmojis } from "../vendors/giticon";
import * as output from "./output";

export default async function prompts({
  gitmoji,
  showEditor,
  emojiFormat,
  lineBreak,
  promptBody,
}: {
  gitmoji: boolean;
  showEditor: boolean;
  emojiFormat: configuration.EMOJI_FORMAT;
  lineBreak: string;
  promptBody: boolean;
}): Promise<CommitMessage> {
  const commitMessage = new CommitMessage();

  function lineBreakFormatter(input: string): string {
    if (lineBreak) {
      return input.replace(
        new RegExp(lineBreak.replace(/\\/g, "\\\\"), "g"),
        "\n"
      );
    }
    return input;
  }

  const questions: Prompt[] = [
    {
      type: PROMPT_TYPES.QUICK_PICK,
      name: "gitmoji",
      placeholder: "Choose a gitmoji.",
      items: gitmojis.map(function ({ emoji, name, description, code }) {
        return {
          label: emojiFormat === "code" ? name : emoji,
          description: emojiFormat === "code" ? emoji : name,
          detail: description,
          code,
        };
      }),
      noneItem: {
        label: "None",
        description: "",
        detail: "No gitmoji",
        alwaysShow: true,
      },
    },
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: "scope",
      placeholder: "Denote the scope of this change.",
      validate(input: string) {
        return commitlint.lintScope(input);
      },
    },
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: "subject",
      placeholder: "Write a short, imperative tense description of the change.",
      validate(input: string) {
        const { scope, gitmoji } = commitMessage;
        const serializedSubject = serializeSubject({
          gitmoji,
          subject: input,
        });
        let subjectError = commitlint.lintSubject(serializedSubject);
        if (subjectError) {
          if (gitmoji) {
            subjectError += " (";
            subjectError += "including ";
            subjectError += "gitmoji: ";
            subjectError += gitmoji;
            subjectError += ")";
          }
          return subjectError;
        }

        let headerError = commitlint.lintHeader(
          serializeHeader({
            scope,
            gitmoji,
            subject: input,
          })
        );
        if (headerError) {
          headerError += " (";
          if (scope) {
            headerError += ", ";
            headerError += "scope: ";
            headerError += scope;
          }
          if (gitmoji) {
            headerError += ", ";
            headerError += "gitmoji: ";
            headerError += gitmoji;
          }
          headerError += ")";
          return headerError;
        }

        return "";
      },
      format: lineBreakFormatter,
    },
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: "body",
      placeholder: "Provide a longer description of the change.",
      validate(input: string) {
        return commitlint.lintBody(input);
      },
      format: lineBreakFormatter,
    },
    {
      type: PROMPT_TYPES.QUICK_PICK,
      name: "footerType",
      placeholder: "Choose a footerType.",
      items: [
        {
          label: "iQuality",
          detail: "Please enter feedback ID",
        },
        {
          label: "iDev",
          detail: "An efficient Teamwork solution. Please enter ID",
        },
      ],
      noneItem: {
        label: "None",
        description: "",
        detail: "No footerType",
        alwaysShow: true,
      },
    },
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: "footer",
      placeholder: "Please enter iQ ID or iDev ID.",
      validate(input: string) {
        return commitlint.lintFooter(input);
      },
      format: lineBreakFormatter,
    },
  ]
    .filter(function (question) {
      if (question.name === "gitmoji" && !gitmoji) {
        return false;
      }

      if (question.name === "body") {
        if (showEditor || !promptBody) {
          return false;
        }
      }

      return true;
    })
    .map(function (question, index, array) {
      return {
        ...question,
        step: index + 1,
        totalSteps: array.length,
        buttons: index > 0 ? [QuickInputButtons.Back] : [],
      };
    });

  const promptStatuses: PromptStatus[] = new Array<PromptStatus>(
    questions.length
  )
    .fill({
      value: "",
      activeItems: [],
    })
    .map(() => ({
      value: "",
      activeItems: [],
    }));

  let index = 0;
  while (index < questions.length) {
    const activeItem = promptStatuses[index].activeItems[0];
    if (questions[index].type === PROMPT_TYPES.QUICK_PICK) {
      if (activeItem) {
        questions[index].activeItems = [activeItem];
      }
    } else {
      questions[index].value = promptStatuses[index].value;
    }

    try {
      promptStatuses[index] = await promptTypes[questions[index].type](
        // @ts-ignore
        questions[index]
      );
    } catch (e: any) {
      if (e && "button" in e) {
        if (e.button === QuickInputButtons.Back) {
          promptStatuses[index] = {
            value: "value" in e ? e.value : promptStatuses[index].value,
            activeItems:
              "activeItems" in e
                ? e.activeItems
                : promptStatuses[index].activeItems,
          };
          index -= 1;
          continue;
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }

    index += 1;
  }

  promptStatuses
    .map((p, index) => {
      const activeItem = p.activeItems[0];
      if (!activeItem) {
        return p.value;
      }
      if (
        questions[index].noneItem &&
        activeItem === questions[index].noneItem
      ) {
        return "";
      }

      if (questions[index].name === "gitmoji") {
        return `${activeItem.label}: ${activeItem.code}`;
      }

      return activeItem.label;
    })
    .forEach((value, index) => {
      commitMessage[questions[index].name as keyof CommitMessage] =
        questions[index].format?.(value) ?? value;
    });

  return commitMessage;
}
