import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { InfoSection } from '../InfoSection/InfoSection.tsx';
import { PictureSection } from '../PictureSection/PictureSection.tsx';
import settingsStyles from '../SettingsDialog/SettingsDialog.module.css';

type Props = {
  onClose: () => void;
};

// What our contacts see of us: the picture, the phone number and the description. Loaded only when opened: the phone
// number's checks and the flags are big.
export const ProfileDialog = ({ onClose }: Props) => (
  <Dialog title="Profile info" onClose={onClose}>
    <PictureSection />
    <InfoSection />
    <section className={settingsStyles.section}>
      <p>
        Your contacts see these. They go straight to them over the encrypted connection, never through relays or
        servers. Every contact gets the same ones, so contacts who know each other can tell it is you.
      </p>
    </section>
  </Dialog>
);
