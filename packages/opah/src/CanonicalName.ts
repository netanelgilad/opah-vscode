import { Record, RecordOf } from 'immutable';

export type CanonicalNameProps = {
  uri: string;
  name: string;
};

const makeCanonicalName = Record<CanonicalNameProps>({
  uri: '',
  name: '',
});

export const CanonicalName = (props: CanonicalNameProps) =>
  makeCanonicalName(props);

export type CanonicalName = RecordOf<CanonicalNameProps>;
