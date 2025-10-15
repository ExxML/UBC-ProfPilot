import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BACKEND_URL } from '../config.js';

/**
 * Shared search hook for WebSocket-based searches with timeout handling
 * @param {Object} config - Configuration object
 * @param {string} config.progressEvent - WebSocket event name for progress updates
 * @param {string} config.completeEvent - WebSocket event name for completion
 * @param {string} config.errorEvent - WebSocket event name for errors
 * @param {string} config.completeMessage - Message to display on completion
 * @param {string} config.errorMessage - Message to display on error
 * @param {string} config.timeoutErrorMessage - Error message for timeout
 */
export const useSearch = (config) => {
  const {
    progressEvent,
    completeEvent,
    errorEvent,
    completeMessage,
    errorMessage,
    timeoutErrorMessage
  } = config;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ percentage: 0, phase: 'idle', message: 'Ready to search' });
  const [searchDurationMs, setSearchDurationMs] = useState(null);
  
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const lastMessageTimeRef = useRef(null);
  const initTimeoutRef = useRef(null);

  const FINAL_SEARCH_TIMEOUT = 60000;
  const SEARCH_TIMEOUT = 120000;
  const INIT_TIMEOUT = 240000;

  // Timeout handlers
  const createTimeoutHandler = useCallback(() => {
    return () => {
      setError(timeoutErrorMessage);
      setLoading(false);
      setProgress({ percentage: 0, phase: 'timeout', message: 'Request timed out' });
    };
  }, [timeoutErrorMessage]);

  const createInitTimeoutHandler = useCallback(() => {
    return () => {
      setError(`API initialization timed out after 4 minutes. The service may be unresponsive. Please try reloading the page.`);
      setLoading(false);
      setProgress({ percentage: 0, phase: 'error', message: 'Initialization timeout - no response from API' });
    };
  }, []);

  const handleInactivityTimeout = useCallback(() => {
    setProgress(prev => ({ ...prev, message: 'Waiting 1 minute for backend response...' }));
    timeoutRef.current = setTimeout(createTimeoutHandler(), FINAL_SEARCH_TIMEOUT);
  }, [createTimeoutHandler]);

  // Clear all timers utility
  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const backendUrl = API_BACKEND_URL;
    socketRef.current = io(backendUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: false,
    });
    sessionIdRef.current = Date.now().toString();

    const socket = socketRef.current;

    const handleProgress = (data) => {
      clearAllTimers();
      
      lastMessageTimeRef.current = Date.now();
      inactivityTimeoutRef.current = setTimeout(handleInactivityTimeout, SEARCH_TIMEOUT);

      setProgress({
        percentage: data.percentage,
        phase: data.phase,
        message: data.message
      });
    };

    const handleComplete = (data) => {
      setResult(data);
      const end = performance.now();
      setSearchDurationMs(end - (startTimeRef.current || end));
      setProgress({ percentage: 100, phase: 'complete', message: completeMessage });

      setTimeout(() => {
        setLoading(false);
      }, 1500);

      clearAllTimers();
    };

    const handleError = (data) => {
      setError(data.error);
      setLoading(false);
      setProgress({ percentage: 0, phase: 'error', message: errorMessage });
      clearAllTimers();
    };

    socket.on(progressEvent, handleProgress);
    socket.on(completeEvent, handleComplete);
    socket.on(errorEvent, handleError);

    return () => {
      if (socket) {
        socket.off(progressEvent, handleProgress);
        socket.off(completeEvent, handleComplete);
        socket.off(errorEvent, handleError);
        socket.disconnect();
      }
      socketRef.current = null;
      startTimeRef.current = null;
      clearAllTimers();
    };
  }, [progressEvent, completeEvent, errorEvent, completeMessage, errorMessage, handleInactivityTimeout, clearAllTimers]);

  // Stop search handler
  const stopSearch = useCallback(() => {
    if (socketRef.current && sessionIdRef.current) {
      console.log('Sending stop signal to backend...');
      socketRef.current.emit('stop-search', {
        sessionId: sessionIdRef.current
      });
    }

    clearAllTimers();
    setLoading(false);
    setError(null);
    setResult(null);
    setProgress({ percentage: 0, phase: 'idle', message: 'Search stopped' });
    setSearchDurationMs(null);
    startTimeRef.current = null;
  }, [clearAllTimers]);

  // Start search handler
  const startSearch = useCallback((eventName, payload, initialMessage) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress({ percentage: 0, phase: payload.phase || 'initializing', message: initialMessage });

    clearAllTimers();
    startTimeRef.current = performance.now();
    setSearchDurationMs(null);

    initTimeoutRef.current = setTimeout(createInitTimeoutHandler(), INIT_TIMEOUT);

    if (socketRef.current) {
      lastMessageTimeRef.current = Date.now();
      socketRef.current.emit(eventName, {
        ...payload,
        sessionId: sessionIdRef.current
      });
    }
  }, [clearAllTimers, createInitTimeoutHandler]);

  // Emit custom event (for skip actions, etc.)
  const emitEvent = useCallback((eventName, payload) => {
    if (socketRef.current && sessionIdRef.current) {
      socketRef.current.emit(eventName, {
        ...payload,
        sessionId: sessionIdRef.current
      });
    }
  }, []);

  return {
    loading,
    result,
    error,
    progress,
    searchDurationMs,
    startSearch,
    stopSearch,
    emitEvent,
    setProgress
  };
};
