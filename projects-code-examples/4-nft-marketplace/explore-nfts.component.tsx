export default function ExploreNFTs() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col justify-end gap-4 sm:flex-col ">
        <div className="flex justify-between gap-4">
          <TextElement title="Mintplace" titleStyle="text-display-medium" />
        </div>
      </div>

      <TabsPrimary
        tabs={[
          {
            id: "1_Available",
            header: "Available",
            onTabClick: () => {},
            content: <div>Available Rarity Types</div>,
          },
          {
            id: "2_MyPurchases",
            header: "My purchases",
            onTabClick: () => {},
            content: <div>My Purchases</div>,
          },
        ]}
        rightElementToTabs={
          <div
            className="flex cursor-pointer items-end justify-center gap-2 pb-[8px]"
            onClick={() => {
              window.open(`https://etherscan.io/token/`, "_blank");
            }}
          >
            <TextElement body="Etherscan" />
          </div>
        }
      />

      <SingleRarity3dPreview
        isVisible={false}
        buySectionVisible={false}
        selectedCartItem={null}
        onClose={() => {}}
        setSelectedCartItem={() => {}}
      />
    </div>
  );
}

export const AvailableRarityTypes = (props: {
  rarityTypesToDisplay: (CartItem | null)[] | null;
  rarityTypeElement: (rarityType: CartItem) => React.ReactNode;
}) => {
  return (
    <ResponsiveGridWrapper>
      <p className={"text-gray-500"}>*Connect your wallet to see your NFTs</p>
    </ResponsiveGridWrapper>
  );
};
