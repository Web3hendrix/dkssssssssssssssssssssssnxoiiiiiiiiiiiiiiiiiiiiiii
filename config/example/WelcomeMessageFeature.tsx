import { SimpleGrid } from '@chakra-ui/layout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  TextAreaForm,
  ColorPickerForm, 
  DatePickerForm,
  FilePickerForm,
  SwitchFieldForm,
  ChannelSelectForm
} from '../../components/forms';
import type { UseFormRender, WelcomeMessageFeature } from '../types';

const schema = z.object({
  message: z.string().min(20),
  channel: z.string(),
  color: z.string().optional(),
  date: z.date().optional(),
  file: z.instanceof(File, { message: 'File is required' }).array().optional(),
  danger: z.boolean(),
});

type Input = z.infer<typeof schema>;

export const useWelcomeMessageFeature: UseFormRender<WelcomeMessageFeature> = (data: WelcomeMessageFeature, onSubmit: (data: WelcomeMessageFeature) => Promise<WelcomeMessageFeature>) => {
  const { register, reset, handleSubmit, formState, control } = useForm<Input>({
    resolver: zodResolver(schema),
    shouldUnregister: false,
    defaultValues: {
      channel: data.channel,
      message: data.message ?? '',
      color: undefined,
      date: undefined,
      file: [],
      danger: false,
    },
  });

  return {
    component: (
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
        <ChannelSelectForm
          control={{
            label: 'Channel',
            description: 'Where to send the welcome message',
          }}
          controller={{ control, name: 'channel' }}
        />
        <TextAreaForm
          control={{
            label: 'Message',
            description: 'The message to send',
            error: formState.errors.message?.message,
          }}
          placeholder="Type some text here..."
          {...register('message')}
        />
        <ColorPickerForm
          control={{
            label: 'Color',
            description: 'The color of message',
          }}
          controller={{ control, name: 'color' }}
        />
        <FilePickerForm
          control={{
            label: 'File',
            description: 'The file to upload',
          }}
          options={{ accept: { 'image/*': [] }, multiple: false }}
          controller={{
            control,
            name: 'file',
            rules: {
              validate: {
                required: (files: File[] | undefined) => {
                  if (!files || files.length === 0) {
                    return 'File is required';
                  }
                  return true;
                }
              }
            }
          }}
        />
        <ColorPickerForm
          control={{
            label: 'Color',
            description: 'The color of message',
          }}
          controller={{ control, name: 'color' }}
        />
        <DatePickerForm
          control={{
            label: 'Date',
            description: 'The date of today',
          }}
          controller={{ control, name: 'date' }}
        />
        <SwitchFieldForm
          control={{ label: 'Turn on', description: 'Enable something' }}
          controller={{
            control,
            name: 'danger',
          }}
        />
      </SimpleGrid>
    ),
    onSubmit: handleSubmit(async (e) => {
      const result = await onSubmit({
        message: e.message,
        channel: e.channel
      });
      reset(result);
    }),
    canSave: formState.isDirty,
    reset: () => reset(control._defaultValues),
  };
};
