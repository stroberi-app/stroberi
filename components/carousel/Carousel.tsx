import * as React from 'react';
import { useSharedValue } from 'react-native-reanimated';
import CarouselComp, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel';
import { useWindowDimensions, View } from 'tamagui';
import { ReactElement } from 'react';

const colors = ['#26292E', '#26292E', '#26292E', '#26292E', '#26292E', '#26292E'];

type CarouselProps = {
  renderItem: ({ index }: { index: number }) => ReactElement;
  data: number[];
};
export function Carousel({ renderItem, data }: CarouselProps) {
  const progress = useSharedValue<number>(0);
  const { width } = useWindowDimensions();
  const baseOptions = {
    vertical: false,
    width: width,
    height: width * 0.6,
  } as const;

  const ref = React.useRef<ICarouselInstance>(null);

  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      /**
       * Calculate the difference between the current index and the target index
       * to ensure that the carousel scrolls to the nearest index
       */
      count: index - progress.value,
      animated: true,
    });
  };

  return (
    <>
      <CarouselComp
        {...baseOptions}
        loop
        ref={ref}
        width={width - 16}
        height={width / 1.5}
        data={data}
        scrollAnimationDuration={1000}
        pagingEnabled
        snapEnabled
        autoPlay={false}
        onProgressChange={progress}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 1,
          parallaxScrollingOffset: 5,
        }}
        renderItem={renderItem}
      />
      <Pagination.Basic<{ color: string }>
        progress={progress}
        data={new Array(data.length).fill({
          color: colors[0],
        })}
        size={12}
        dotStyle={{
          borderRadius: 100,
          backgroundColor: 'rgba(73,72,72,0.4)',
        }}
        activeDotStyle={{
          borderRadius: 100,
          overflow: 'hidden',
        }}
        containerStyle={{
          gap: 14,
          marginTop: 14,
        }}
        horizontal
        renderItem={item => (
          <View
            style={{
              backgroundColor: item.color,
              flex: 1,
            }}
          />
        )}
        onPress={onPressPagination}
      />
    </>
  );
}
