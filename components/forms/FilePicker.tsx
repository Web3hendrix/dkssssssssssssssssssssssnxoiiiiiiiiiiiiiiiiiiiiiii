import { Box, Center, Flex, Text, VStack } from '@chakra-ui/layout';
import { Icon, Image, useFormControl } from '@chakra-ui/react';
import { ComponentProps } from 'react';
import Dropzone, { DropzoneOptions } from 'react-dropzone';
import { FaFile } from 'react-icons/fa';
import { MdUpload } from 'react-icons/md';
import { FormCard } from './Form';
import { useController } from 'react-hook-form';
import { ControlledInput } from './types';
import { useFileUrl } from '../../utils/use-file-url';

export type FilePickerFormProps = {
  options?: DropzoneOptions;
  placeholder?: string;
};

export const FilePickerForm: ControlledInput<FilePickerFormProps, string | undefined | null> = ({
  control,
  controller,
  options,
  placeholder,
}) => {
  const {
    field: { value, onChange, ref, ...field },
    fieldState,
  } = useController(controller);

  const empty = value == null || value === '';

  return (
    <FormCard {...control} error={fieldState.error?.message}>
      <Dropzone ref={ref} {...options} onDrop={onChange}>
        {({ getInputProps, getRootProps }) => (
          <Box
            bg="InputBackground"
            border="1px dashed"
            borderColor="InputBorder"
            borderRadius="16px"
            w="100%"
            p={5}
            cursor="pointer"
            {...getRootProps()}
          >
            <Input input={getInputProps(field)} />
            {empty ? (
              <VStack
                color="secondaryGray.700"
                textAlign="center"
                _dark={{ color: 'secondaryGray.600' }}
              >
                <Icon as={MdUpload} w="70px" h="70px" />
                <Text fontWeight="500">{placeholder ?? 'Upload Files'}</Text>
              </VStack>
            ) : (
              <Flex direction="column" gap={2}>
                {value && <FilePreview file={value} />}
              </Flex>
            )}
          </Box>
        )}
      </Dropzone>
    </FormCard>
  );
};

function Input({ input }: { input: ComponentProps<'input'> }) {
  const inputProps = useFormControl<HTMLInputElement>(input);

  return <input {...inputProps} />;
}

function FilePreview({ file }: { file: string | File }) {
  const fileName = typeof file === 'string' ? file.split('/').pop() : file.name;
  const url = typeof file === 'string' ? file : useFileUrl(file);
  
  return (
    <Flex direction="row" gap={2} w="full" align="center">
      {(typeof file === 'string' || (file instanceof File && file.type?.startsWith?.('image/'))) && url ? (
        <Image alt={fileName} maxW="70px" maxH="70px" src={url} rounded="md" />
      ) : (
        <Center rounded="2xl" bg="brand.300" w="50px" h="50px">
          <Icon as={FaFile} color="white" />
        </Center>
      )}
      <VStack align="start" flex={1} spacing="3px">
        <Text fontSize="md" fontWeight="600" color="TextPrimary">
          {fileName}
        </Text>
        {typeof file !== 'string' && (
          <Text fontSize="sm" color="TextSecondary">
            {file.size} bytes
          </Text>
        )}
      </VStack>
    </Flex>
  );
}
