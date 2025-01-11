import { SimpleGrid } from '@chakra-ui/layout';
import { InputForm } from '../../components/forms/InputForm';
import { SwitchFieldForm } from '../../components/forms/SwitchField';
import { UseFormRender, TriggerWordsFeature } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  words: z.string().min(1).transform((val) => val.split(',').map(w => w.trim())),
  response: z.string().min(1),
  enabled: z.boolean()
});

type Input = z.infer<typeof schema>;
type FormValues = Omit<Input, 'words'> & { words: string };

export const useTriggerWordsFeature: UseFormRender<TriggerWordsFeature, TriggerWordsFeature> = (data, onSubmit) => {
  const { register, reset, handleSubmit, formState, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    shouldUnregister: false,
    defaultValues: {
      words: data?.words ? data.words.join(', ') : '',
      response: data?.response || '',
      enabled: data?.enabled || false
    } as FormValues
  });

  return {
    component: (
      <SimpleGrid columns={1} gap={3}>
        <InputForm
          control={{
            label: 'Trigger Words',
            description: 'Comma separated words that trigger the response',
            error: formState.errors.words?.message
          }}
          placeholder="word1, word2, word3"
          {...register('words')}
        />
        <InputForm
          control={{
            label: 'Response',
            description: 'Response when trigger words are detected',
            error: formState.errors.response?.message
          }}
          placeholder="Your response here"
          {...register('response')}
        />
        <SwitchFieldForm
          control={{ label: 'Enabled', description: 'Enable trigger words feature' }}
          controller={{
            control,
            name: 'enabled'
          }}
        />
      </SimpleGrid>
    ),
  onSubmit: handleSubmit(async (e) => {
    const words: string = typeof e.words === 'string' ? e.words : (e.words as string[]).join(',');
    const result = await onSubmit({
      words: words.split(',').map((w: string) => w.trim()),
      response: e.response,
      enabled: e.enabled
    } as TriggerWordsFeature);
      const formData: FormValues = {
        response: result.response,
        enabled: result.enabled,
        words: result.words.join(', ')
      };
      reset(formData);
    }),
    canSave: formState.isDirty,
    reset: () => {
      const defaultValues = control._defaultValues as FormValues;
      reset(defaultValues);
    }
  };
};
