import { useState, type DragEvent } from 'react';
import { sendFiles } from '../../store/thunks/sendFiles.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { CallPanel } from '../CallPanel/CallPanel.tsx';
import { ChatHeader } from '../ChatHeader/ChatHeader.tsx';
import { Composer } from '../Composer/Composer.tsx';
import { MessageList } from '../MessageList/MessageList.tsx';
import styles from './Chat.module.css';

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files');

export const Chat = () => {
  const dispatch = useAppDispatch();
  const connected = useAppSelector(state => state.connection.status === 'connected');
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
    dispatch(sendFiles(Array.from(e.dataTransfer.files)));
  };

  return (
    <section className={styles.card} onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop}>
      <ChatHeader />
      <CallPanel />
      <MessageList />
      <Composer />
      {dragging && <div className={styles.dropZone}>Drop files to send</div>}
    </section>
  );
};
