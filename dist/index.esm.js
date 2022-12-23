import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Socket } from "phoenix";
import * as rfc6902 from "rfc6902";
const useStateChannel = () => {
  return useContext(StateChannelContext);
};
const useChannel = (topic) => {
  const [channel, setChannel] = useState();
  const { socket } = useContext(PhoenixSocketContext);
  useEffect(() => {
    const joinedChannel = socket.channel(topic);
    joinedChannel.join().receive("ok", () => {
      setChannel(joinedChannel);
    });
    return () => {
      joinedChannel.leave();
    };
    setChannel(joinedChannel);
  }, []);
  return [channel];
};
const StateChannelContext = createContext({ channel: null, state: null, pushMessage: null, clientVersionRef: null, serverVersion: null, incrementClientVersion: null });
const StateChannelProvider = ({ topic, children }) => {
  const [channel] = useChannel(topic);
  const [appState, setAppState] = useState();
  const [serverVersion, setServerVersion] = useState(0);
  const clientVersionRef = useRef(1);
  useEffect(() => {
    if (!channel)
      return;
    channel.push("_SC_SYNC_", {});
    const setStateRef = channel.on("set_state", ({ state, version }) => {
      setAppState(state);
      setServerVersion(version);
    });
    const stateDiffRef = channel.on("state_diff", ({ diff, version }) => {
      setAppState((state) => {
        let newState = { ...state };
        rfc6902.applyPatch(newState, diff);
        return newState;
      });
      setServerVersion(version);
    });
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
    channel.push("_SCMSG:" + key, { value, version: clientVersionRef.current });
  };
  if (!channel)
    return null;
  if (!appState)
    return null;
  return /* @__PURE__ */ React.createElement(StateChannelContext.Provider, { value: { channel, pushMessage, serverVersion, incrementClientVersion, clientVersionRef, state: appState } }, children);
};
const PhoenixSocketContext = createContext({ socket: null });
const PhoenixSocketProvider = ({ children, ...props }) => {
  const [socket, setSocket] = useState();
  useEffect(() => {
    const socket2 = new Socket(props.socketUrl || "/socket", { params: props.socketParams || {} });
    socket2.connect();
    setSocket(socket2);
  }, []);
  if (!socket)
    return null;
  return /* @__PURE__ */ React.createElement(PhoenixSocketContext.Provider, { value: { socket } }, children);
};
export {
  PhoenixSocketContext,
  PhoenixSocketProvider,
  StateChannelContext,
  StateChannelProvider,
  useChannel,
  useStateChannel
};
