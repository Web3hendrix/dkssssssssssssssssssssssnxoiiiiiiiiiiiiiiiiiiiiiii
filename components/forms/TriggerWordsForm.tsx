import { useState, useEffect } from 'react';
import { FormCard } from './Form';
import { InputForm } from './InputForm';
import { SwitchField } from './SwitchField';
import { useFeatureQuery, useUpdateFeatureMutation } from '../../api/hooks';
import type { ControlledInput, TriggerWordsFormProps } from './types';

export const TriggerWordsForm: ControlledInput<TriggerWordsFormProps> = ({
  value,
  onChange,
  onBlur
}: {
  value: TriggerWordsFormProps;
  onChange: (value: { words: string[]; response: string; enabled: boolean }) => void;
  onBlur?: () => void;
}) => {
  const [words, setWords] = useState('');
  const [response, setResponse] = useState('');
  const [enabled, setEnabled] = useState(false);
  
  const { data, isLoading: isQueryLoading } = useFeatureQuery(
    value.guildId,
    'trigger-words'
  );
  
  const { mutate: updateFeature, isLoading: isMutationLoading, error } = 
    useUpdateFeatureMutation();

  // Set initial values when data loads
  useEffect(() => {
    if (data) {
      setWords(data.words.join(', '));
      setResponse(data.response);
      setEnabled(data.enabled);
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const wordsArray = words.split(',').map(w => w.trim());
    const config = {
      words: wordsArray,
      response,
      enabled
    };

    updateFeature({
      guild: value.guildId,
      feature: 'trigger-words',
      options: JSON.stringify(config)
    });

    onChange(config);
    onBlur?.();
  };

  const isLoading = isQueryLoading || isMutationLoading;

  return (
    <FormCard 
      label="Trigger Words Configuration"
      description="Configure words that will trigger automatic responses"
    >
      <form onSubmit={handleSubmit}>
        <InputForm
          control={{
            label: "Trigger Words",
            required: true
          }}
          value={words}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWords(e.target.value)}
          placeholder="comma,separated,words"
        />
        <InputForm
          control={{
            label: "Response",
            required: true
          }}
          value={response}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResponse(e.target.value)}
          placeholder="Response when trigger words are detected"
        />
        <SwitchField
          label="Enabled"
          isChecked={enabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnabled(e.target.checked)}
        />
        <button type="submit">Save</button>
      </form>
    </FormCard>
  );
};
