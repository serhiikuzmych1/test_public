const getInitialConnector = (
  previousWalletId: string,
  connectors: Connector[]
): { connector: Connector | undefined; chainId?: number } | undefined => {
  const targetNetwork = getTargetNetwork();

  const allowBurner = optionsConfig.onlyLocalBurnerWallet ? targetNetwork.id === hardhat.id : true;

  if (!previousWalletId) {
    if (allowBurner && optionsConfig.walletAutoConnect) {
      const connector = connectors.find((f) => f.id === burnerWalletId);
      return { connector, chainId: defaultBurnerChainId };
    }
  } else {
    if (optionsConfig.walletAutoConnect) {
      if (previousWalletId === burnerWalletId && !allowBurner) {
        return;
      }

      const connector = connectors.find((f) => f.id === previousWalletId);
      return { connector };
    }
  }

  return undefined;
};

export const useAutoConnect = (): void => {
  const wagmiWalletValue = useReadLocalStorage<string>(WAGMI_WALLET_STORAGE_KEY);
  const [walletId, setWalletId] = useLocalStorage<string>(
    SCAFFOLD_WALLET_STROAGE_KEY,
    wagmiWalletValue ?? ""
  );
  const connectState = useConnect();
  const accountState = useAccount();

  useEffect(() => {
    if (accountState.isConnected) {
      setWalletId(accountState.connector?.id ?? "");
    } else {
      window.localStorage.setItem(WAGMI_WALLET_STORAGE_KEY, JSON.stringify(""));
      setWalletId("");
    }
  }, [accountState.isConnected, accountState.connector?.name]);

  useEffectOnce(() => {
    const initialConnector = getInitialConnector(walletId, connectState.connectors);

    if (initialConnector?.connector) {
      connectState.connect({
        connector: initialConnector.connector,
        chainId: initialConnector.chainId,
      });
    }
  });
};
