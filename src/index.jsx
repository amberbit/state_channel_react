import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Socket } from 'phoenix';
import * as rfc6902 from "rfc6902";

export const useStateChannel = () => {
  return useContext(StateChannelContext);
};

export const useChannel = topic => {
  const [channel, setChannel] = useState();
  const { socket } = useContext(PhoenixSocketContext);

  useEffect(() => {
    const joinedChannel = socket.channel(topic);

    joinedChannel.join().receive('ok', () => {
      setChannel(joinedChannel);
    });

    return () => {
      joinedChannel.leave();
    };
  }, []);
  
  return [channel];
};

export const StateChannelContext = createContext({ channel: null, state: null, pushMessage: null, clientVersionRef: null, serverVersion: null, incrementClientVersion: null });

export const StateChannelProvider = ({ topic, children }) => {
  const [channel] = useChannel(topic);
  const [appState, setAppState] = useState();
  const [serverVersion, setServerVersion] = useState(0);
  const clientVersionRef = useRef(1);

  useEffect(() => {
    if (!channel) return;

    const setStateRef = channel.on("set_state", ({state: state, version: version}) => {
      setAppState(state);
      setServerVersion(version);
    });

    const stateDiffRef = channel.on("state_diff", ({diff: diff, version: version}) => {
      setAppState((state) => {
        let newState = {...state};

        rfc6902.applyPatch(newState, diff)
        return newState;
      });
      setServerVersion(version);
    });
   
    // stop listening to this message before the component unmounts
    return () => {
      channel.off("set_state", setStateRef);
      channel.off("state_diff", stateDiffRef);
    };
  }, [channel]);

  const incrementClientVersion = () => {
    clientVersionRef.current = clientVersionRef.current + 2;
  };

  const pushMessage = (key, value) => {
    incrementClientVersion();
    channel.push("_SCMSG:"+key, {value: value, version: clientVersionRef.current});
  }

  if (!channel) return null;
  if (!appState) return null;

  return (
    <StateChannelContext.Provider value={{ channel, pushMessage, serverVersion, incrementClientVersion, clientVersionRef: clientVersionRef, state: appState }}>{children}</StateChannelContext.Provider>
  );
};

export const PhoenixSocketContext = createContext({ socket: null });

export const PhoenixSocketProvider = ({ children, ...props }) => {
  const [socket, setSocket] = useState();

  useEffect(() => {
    const socket = new Socket((props.socketUrl || '/socket'), {params: (props.socketParams || {})});
    socket.connect();
    setSocket(socket);
  }, []);

  if (!socket) return null;

  return (
    <PhoenixSocketContext.Provider value={{ socket }}>{children}</PhoenixSocketContext.Provider>
  );
};

