import { useState, type DragEvent, type ReactNode } from 'react';
import { sendFiles } from '../../../store/thunks/chat/sendFiles.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { CallPanel } from '../../calls/CallPanel/CallPanel.tsx';
import { Composer } from '../Composer/Composer.tsx';
import { MessageList } from '../MessageList/MessageList.tsx';
import styles from './Conversation.module.css';

type Props = {
  convKey: string;
  connected: boolean;
  header: ReactNode;
  // Banners between the header and the messages.
  children?: ReactNode;
};

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files');

// One conversation: header, call, messages and the composer. Files can be dropped anywhere on it.
export const Conversation = ({ convKey, connected, header, children }: Props) => {
  const dispatch = useAppDispatch();
  const inCall = useAppSelector(state => state.call.key === convKey && state.call.status !== 'idle');
  const [dragging, setDragging] = useState(false);

  const dragOver = (e: DragEvent) => {
    if (connected && hasFiles(e)) {
      e.preventDefault();
      setDragging(true);
    }
  };

  const dragLeave = (e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragging(false);
    }
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    dispatch(sendFiles(convKey, Array.from(e.dataTransfer.files)));
  };

  return (
    <section className={styles.conversation} onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop}>
      {header}
      {children}
      {inCall && <CallPanel />}
      <MessageList convKey={convKey} />
      <Composer convKey={convKey} connected={connected} />
      {dragging && <div className={styles.dropZone}>Drop files to send</div>}
    </section>
  );
};
