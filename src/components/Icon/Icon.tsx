import { ICON_PATHS, type IconName } from './paths.ts';

type Props = {
  name: IconName;
  size?: number;
};

export const Icon = ({ name, size = 20 }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={ICON_PATHS[name]} />
  </svg>
);
