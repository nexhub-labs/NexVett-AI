import { createContext, useContext, useState, ReactNode } from "react";
import {
  Message,
  ParseResult,
  AnalysisResult,
  MultiFileAnalysisResult,
  AccountsAnalysisResult
} from "@nexvett-ai/shared";

interface SessionContextType {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  analysisContext: string | undefined;
  setAnalysisContext: (context: string | undefined) => void;
  parseResult: ParseResult | null;
  setParseResult: (result: ParseResult | null) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  accountsAnalysis: AccountsAnalysisResult | null;
  setAccountsAnalysis: (analysis: AccountsAnalysisResult | null) => void;
  multiFileResult: MultiFileAnalysisResult | null;
  setMultiFileResult: (result: MultiFileAnalysisResult | null) => void;

  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  // All state is now purely in-memory. Page reload clears everything.
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [analysisContext, setAnalysisContextState] = useState<string | undefined>();
  const [parseResult, setParseResultState] = useState<ParseResult | null>(null);
  const [analysisResult, setAnalysisResultState] = useState<AnalysisResult | null>(null);
  const [accountsAnalysis, setAccountsAnalysisState] = useState<AccountsAnalysisResult | null>(null);
  const [multiFileResult, setMultiFileResultState] = useState<MultiFileAnalysisResult | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);


  const setMessages = (value: Message[] | ((prev: Message[]) => Message[])) => {
    setMessagesState((prev) => {
      const newMessages = typeof value === "function" ? value(prev) : value;
      return newMessages;
    });
  };

  const setAnalysisContext = (context: string | undefined) => {
    setAnalysisContextState(context);
  };

  const setParseResult = (result: ParseResult | null) => {
    setParseResultState(result);
  };

  const setAnalysisResult = (result: AnalysisResult | null) => {
    setAnalysisResultState(result);
  };

  const setAccountsAnalysis = (analysis: AccountsAnalysisResult | null) => {
    setAccountsAnalysisState(analysis);
  };

  const setMultiFileResult = (result: MultiFileAnalysisResult | null) => {
    setMultiFileResultState(result);
  };



  const clearSession = () => {
    setMessagesState([]);
    setAnalysisContextState(undefined);
    setParseResultState(null);
    setAnalysisResultState(null);
    setAccountsAnalysisState(null);
    setMultiFileResultState(null);
    setIsChatOpen(false);
  };

  return (
    <SessionContext.Provider
      value={{
        messages,
        setMessages,
        analysisContext,
        setAnalysisContext,
        parseResult,
        setParseResult,
        analysisResult,
        setAnalysisResult,
        accountsAnalysis,
        setAccountsAnalysis,
        multiFileResult,
        setMultiFileResult,
        isChatOpen,
        setIsChatOpen,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
