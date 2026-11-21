import styles from './Logo.module.css';

type Props = {
  size: number;
};

/** The app logo (the same file as the browser tab icon). Decorative: the app name always sits next to it. */
export const Logo = ({ size }: Props) => (
  <img className={styles.logo} src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={size} height={size} />
);
