import { SimpleGrid, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Button } from '@chakra-ui/react';
import { InputForm } from '../../components/forms/InputForm';
import { UseFormRender } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChannelSelectForm } from '../../components/forms/ChannelSelect';

import { FilePickerForm } from '../../components/forms/FilePicker';
import { SwitchFieldForm } from '../../components/forms/SwitchField';

const fileSchema = z.object({
  type: z.literal('file'),
  source: z.string().min(1, 'Filename is required'),
  channel: z.string(),
  volume: z.number().min(0).max(100),
  autoplay: z.boolean()
});

const urlSchema = z.object({
  type: z.literal('url'),
  source: z.string().url('Invalid URL'),
  channel: z.string(),
  volume: z.number().min(0).max(100),
  autoplay: z.boolean()
});

const schema = z.discriminatedUnion('type', [fileSchema, urlSchema]);

type Input = z.infer<typeof schema>;

export const useMusicPlayerFeature: UseFormRender<Input> = (data, onSubmit) => {
  const { register, reset, handleSubmit, formState, control, setValue, watch } = useForm<Input>({
    resolver: zodResolver(schema),
    shouldUnregister: false,
    defaultValues: data?.source ? {
      ...(typeof data.source === 'string' && data.source.startsWith('http') ? {
        type: 'url',
        source: data.source,
        channel: data.channel || '',
        volume: data.volume ? Number(data.volume) : 50,
        autoplay: data.autoplay || false
      } : {
        type: 'file',
        source: typeof data.source === 'string' ? data.source : '',
        channel: data.channel || '',
        volume: data.volume ? Number(data.volume) : 50,
        autoplay: data.autoplay || false
      })
    } : {
      type: 'file',
      source: '',
      channel: '',
      volume: 50,
      autoplay: false
    },
  });

  const volume = watch('volume');

  return {
    component: (
      <SimpleGrid columns={{ base: 1 }} gap={3}>
        <ChannelSelectForm
          control={{
            label: 'Audio Channel',
            description: 'Channel where music will play'
          }}
          controller={{ control, name: 'channel' }}
        />
        
        {watch('type') === 'file' ? (
          <FilePickerForm
            control={{
              label: 'Music File',
              description: 'Upload an audio file to play'
            }}
            options={{ accept: { 'audio/*': [] }, multiple: false }}
            controller={{ 
              control, 
              name: 'source',
              rules: {
                required: 'File is required',
                validate: {
                  validFile: (value: string) => value.length > 0 || 'Invalid file'
                }
              }
            }}
          />
        ) : (
          <InputForm
            control={{
              label: 'Music URL',
              description: 'Enter a URL to an audio file'
            }}
            {...register('source', {
              validate: {
                validUrl: (value: string | File) => {
                  if (watch('type') === 'url' && typeof value === 'string') {
                    try {
                      z.string().url().parse(value);
                      return true;
                    } catch {
                      return 'Invalid URL';
                    }
                  }
                  return true;
                }
              }
            })}
          />
        )}
        <Button
          onClick={() => setValue('type', watch('type') === 'file' ? 'url' : 'file')}
          variant="ghost"
          size="sm"
          mt={2}
        >
          Switch to {watch('type') === 'file' ? 'URL' : 'File'} input
        </Button>

        <div>
          <label>Volume</label>
          <Slider 
            value={volume}
            min={0} 
            max={100}
            onChange={(val) => setValue('volume', val)}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </div>

        <SwitchFieldForm
          control={{ 
            label: 'Autoplay', 
            description: 'Automatically play when joining voice channel' 
          }}
          controller={{
            control,
            name: 'autoplay'
          }}
        />
      </SimpleGrid>
    ),
    onSubmit: handleSubmit(async (values) => {
      if (values.type === 'file') {
        if (typeof values.source !== 'string') {
          throw new Error('Invalid file source');
        }
        const payload: z.infer<typeof fileSchema> = {
          type: 'file',
          source: values.source,
          channel: values.channel,
          volume: values.volume,
          autoplay: values.autoplay
        };
        const data = await onSubmit(JSON.stringify(payload));
        reset(data);
      } else if (values.type === 'url') {
        if (typeof values.source !== 'string') {
          throw new Error('Invalid URL source');
        }
        const payload: z.infer<typeof urlSchema> = {
          type: 'url',
          source: values.source,
          channel: values.channel,
          volume: values.volume,
          autoplay: values.autoplay
        };
        const data = await onSubmit(JSON.stringify(payload));
        reset(data);
      } else {
        throw new Error('Invalid source type');
      }
    }),
    canSave: formState.isDirty,
    reset: () => reset(control._defaultValues),
  };
};
