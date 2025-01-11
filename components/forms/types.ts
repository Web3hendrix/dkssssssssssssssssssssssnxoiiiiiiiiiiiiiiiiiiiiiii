import { Control, ControllerProps, FieldValues } from 'react-hook-form';

export interface FormControl<T extends FieldValues = FieldValues> {
  label: string;
  description?: string;
  error?: string;
  controller?: ControllerProps<T>;
}

export interface TextAreaFormProps<T extends FieldValues = FieldValues> extends FormControl<T> {
  placeholder?: string;
}

export interface ColorPickerFormProps<T extends FieldValues = FieldValues> extends FormControl<T> {
  supportAlpha?: boolean;
}

export interface DatePickerFormProps<T extends FieldValues = FieldValues> extends FormControl<T> {}

export interface FilePickerFormProps<T extends FieldValues = FieldValues> extends FormControl<T> {
  options?: {
    accept?: Record<string, string[]>;
    multiple?: boolean;
  };
}

export interface SwitchFieldFormProps<T extends FieldValues = FieldValues> extends FormControl<T> {}

export interface ChannelSelectFormProps<T extends FieldValues = FieldValues> extends FormControl<T> {}

export interface ControlledInput<T = any> {
  (props: {
    value: T;
    onChange: (value: Partial<T>) => void;
    onBlur?: () => void;
  }): JSX.Element;
}

export interface TriggerWordsFormProps {
  guildId: string;
  words: string[];
  response: string;
  enabled: boolean;
}
