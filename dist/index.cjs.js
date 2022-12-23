var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var src_exports = {};
__export(src_exports, {
  PhoenixSocketContext: () => PhoenixSocketContext,
  PhoenixSocketProvider: () => PhoenixSocketProvider,
  StateChannelContext: () => StateChannelContext,
  StateChannelProvider: () => StateChannelProvider,
  useChannel: () => useChannel,
  useStateChannel: () => useStateChannel
});
module.exports = __toCommonJS(src_exports);
var import_react = __toESM(require("react"));
var import_phoenix = require("phoenix");
var rfc6902 = __toESM(require("rfc6902"));
const useStateChannel = () => {
  return (0, import_react.useContext)(StateChannelContext);
};
const useChannel = (topic) => {
  const [channel, setChannel] = (0, import_react.useState)();
  const { socket } = (0, import_react.useContext)(PhoenixSocketContext);
  (0, import_react.useEffect)(() => {
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
const StateChannelContext = (0, import_react.createContext)({ channel: null, state: null, pushMessage: null, clientVersionRef: null, serverVersion: null, incrementClientVersion: null });
const StateChannelProvider = ({ topic, children }) => {
  const [channel] = useChannel(topic);
  const [appState, setAppState] = (0, import_react.useState)();
  const [serverVersion, setServerVersion] = (0, import_react.useState)(0);
  const clientVersionRef = (0, import_react.useRef)(1);
  (0, import_react.useEffect)(() => {
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
  return /* @__PURE__ */ import_react.default.createElement(StateChannelContext.Provider, { value: { channel, pushMessage, serverVersion, incrementClientVersion, clientVersionRef, state: appState } }, children);
};
const PhoenixSocketContext = (0, import_react.createContext)({ socket: null });
const PhoenixSocketProvider = ({ children, ...props }) => {
  const [socket, setSocket] = (0, import_react.useState)();
  (0, import_react.useEffect)(() => {
    const socket2 = new import_phoenix.Socket(props.socketUrl || "/socket", { params: props.socketParams || {} });
    socket2.connect();
    setSocket(socket2);
  }, []);
  if (!socket)
    return null;
  return /* @__PURE__ */ import_react.default.createElement(PhoenixSocketContext.Provider, { value: { socket } }, children);
};
