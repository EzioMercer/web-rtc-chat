import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { LEGAL } from './LEGAL.ts';
import styles from './LegalDialog.module.css';

type Props = {
  onClose: () => void;
  // Opened in place of Settings: back to it.
  onBack?: () => void;
};

export const LegalDialog = ({ onClose, onBack }: Props) => (
  <Dialog title="Legal" onClose={onClose} onBack={onBack}>
    {LEGAL.map(section => (
      <section key={section.title} className={styles.section}>
        <h3>{section.title}</h3>
        {section.paragraphs.map(text => <p key={text}>{text}</p>)}
        {section.list && (
          <ul>
            {section.list.map(item => <li key={item}>{item}</li>)}
          </ul>
        )}
        {section.after?.map(text => <p key={text}>{text}</p>)}
      </section>
    ))}
  </Dialog>
);
