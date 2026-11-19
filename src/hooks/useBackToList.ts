import { useEffect, useRef } from 'react';
import { selectConversation } from '../store/thunks/chat/selectConversation.ts';
import { useAppDispatch } from '../store/useAppDispatch.ts';
import { useAppSelector } from '../store/useAppSelector.ts';

// Opening a conversation adds a history entry, so the phone's back gesture (or browser back) returns to the list.
export const useBackToList = () => {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.ui.selected);
  const pushed = useRef(false);

  useEffect(() => {
    if (selected && !pushed.current) {
      window.history.pushState({ chat: true }, '');
      pushed.current = true;
    } else if (!selected && pushed.current) {
      pushed.current = false;

      if (window.history.state?.chat) {
        window.history.back();
      }
    }
  }, [selected]);

  useEffect(() => {
    const onPop = () => {
      if (pushed.current) {
        pushed.current = false;
        dispatch(selectConversation(null));
      }
    };

    window.addEventListener('popstate', onPop);

    return () => window.removeEventListener('popstate', onPop);
  }, [dispatch]);
};
