export const NftPortfolio = () => {
  const { account, walletChain } = useWalletContext();
  const { allNfts, noNfts } = useAllNfts();
  const [page, setPage] = React.useState(1);
  const { isMobile } = useBreakpoints();
  const itemsPerPage = useMemo(() => (isMobile ? 4 : 8), [isMobile]);
  const currentPageNfts = useMemo(() => {
    return allNfts.slice((page - 1) * itemsPerPage, (page - 1) * itemsPerPage + itemsPerPage);
  }, [page, itemsPerPage, allNfts]);
  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  const [selectedNft, setSelectedNft] = useState<Nft>();
  useLayoutEffect(() => {
    setSelectedNft(undefined);
  }, [account, walletChain]);
  const resetSelectedNft = useCallback(() => setSelectedNft(undefined), []);
  const SellOrUnlockNftContent = !!selectedNft && <div>Selected NFT Card</div>;
  return (
    <div>
      <div>
        <div>NFT Search Bar</div>
        {noNfts ? (
          <div>No NFTs Page</div>
        ) : (
          <>
            <div>
              {currentPageNfts.map((nft) => {
                return nft ? <div key={nft.token_address + nft.token_id}>NFT Card</div> : <></>;
              })}
            </div>
          </>
        )}
      </div>
      <div>Pagination</div>
      {isMobile ? (
        <>
          <div>
            Modal Content
            <>{SellOrUnlockNftContent}</>
          </div>
        </>
      ) : (
        <>{SellOrUnlockNftContent}</>
      )}
      <div>Orders Table</div>
    </div>
  );
};
