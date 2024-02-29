import * as vscode from "vscode";
import * as configuration from "../configuration";
import createSimpleQuickPick, { confirmButton } from "./quick-pick";
import * as output from "../output";

export enum PROMPT_TYPES {
  QUICK_PICK,
  INPUT_BOX,
}

export type Item = {
  label: string;
  detail?: string;
  description?: string;
  alwaysShow?: boolean;
  placeholder?: string;
  code?: string;
};

export type Prompt = { name: string; type: PROMPT_TYPES } & Options &
  Partial<QuickPickOptions> &
  Partial<InputBoxOptions> &
  Partial<ConfigurableQuickPickOptions>;

export type PromptStatus = { value: string; activeItems: Item[] };

type Options = {
  placeholder: string;
  value?: string;
  format?: (input: string) => string;
  step: number;
  totalSteps: number;
  buttons?: vscode.QuickInputButton[];
};

type QuickPickOptions = {
  items: Item[];
  activeItems: Item[];
  noneItem?: Item;
} & Options;

async function createQuickPick({
  placeholder,
  items = [],
  activeItems = [],
  value,
  step,
  totalSteps,
  noneItem,
  buttons = [],
}: QuickPickOptions): Promise<PromptStatus> {
  if (noneItem && !items.includes(noneItem)) {
    items.unshift(noneItem);
  }
  const promptStatus: PromptStatus = await createSimpleQuickPick<Item>({
    placeholder,
    matchOnDescription: true,
    matchOnDetail: true,
    ignoreFocusOut: true,
    items,
    activeItems,
    value,
    step,
    totalSteps,
    buttons,
  });
  return promptStatus;
}

type InputBoxOptions = {
  validate?: (value: string) => string | undefined;
} & Options;

function createInputBox({
  placeholder,
  value,
  step,
  totalSteps,
  validate = () => undefined,
  buttons,
}: InputBoxOptions): Promise<PromptStatus> {
  return new Promise(function (resolve, reject) {
    const input = vscode.window.createInputBox();
    input.step = step;
    input.totalSteps = totalSteps;
    input.ignoreFocusOut = true;
    input.placeholder = placeholder;
    if (value) {
      input.value = value;
    }
    input.buttons = [...(buttons ?? []), confirmButton];
    input.onDidChangeValue(function () {
      try {
        input.validationMessage = validate(input.value);
      } catch (e: any) {
        output.error(`step.${input.step}`, e);
        reject(e);
      }
    });
    input.onDidAccept(function () {
      try {
        input.validationMessage = validate(input.value);
        if (input.validationMessage) {
          return;
        }
        resolve({ value: input.value, activeItems: [] });
        input.dispose();
      } catch (e: any) {
        output.error(`step.${input.step}`, e);
        reject(e);
      }
    });
    input.onDidTriggerButton(function (e) {
      if (e === confirmButton) {
        try {
          input.validationMessage = validate(input.value);
          if (input.validationMessage) {
            return;
          }
          resolve({ value: input.value, activeItems: [] });
          input.dispose();
        } catch (e: any) {
          output.error(`step.${input.step}`, e);
          reject(e);
        }
      }

      if (e === vscode.QuickInputButtons.Back) {
        reject({
          button: e,
          value: input.value,
        });
      }
    });
    input.prompt = placeholder;
    input.show();
  });
}

export type ConfigurableQuickPickOptions = {
  configurationKey: keyof configuration.Configuration;
  newItem: Item;
  newItemWithoutSetting: Item;
  addNoneOption: boolean;
  validate?: (value: string) => string | undefined;
} & QuickPickOptions;

export default {
  [PROMPT_TYPES.QUICK_PICK]: createQuickPick,
  [PROMPT_TYPES.INPUT_BOX]: createInputBox,
};
