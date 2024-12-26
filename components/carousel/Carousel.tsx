import * as React from 'react';
import { useSharedValue } from 'react-native-reanimated';
import CarouselComp, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel';
import { useWindowDimensions, View } from 'tamagui';
import { ReactElement, useMemo } from 'react';
import { CAROUSEL_ITEM_WRAPPER_HEIGHT } from './CarouselItemWrapper';

const colors = ['#26292E', '#26292E', '#26292E', '#26292E', '#26292E', '#26292E'];

type CarouselProps = {
  renderItem: ({ index }: { index: number }) => ReactElement;
  data: number[];
};
export function Carousel({ renderItem, data }: CarouselProps) {
  const progress = useSharedValue<number>(0);
  const { width } = useWindowDimensions();

  const ref = React.useRef<ICarouselInstance>(null);

  const pagination = useMemo(() => {
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
    return {
      data: new Array(data.length).fill({ color: colors[0] }),
      dotStyle: {
        borderRadius: 100,
        backgroundColor: 'rgba(73,72,72,0.8)',
      } as const,
      activeDotStyle: {
        borderRadius: 100,
        overflow: 'hidden',
      } as const,
      containerStyle: {
        gap: 14,
        marginTop: 14,
      } as const,
      renderItem: (item: { color: string }) => (
        <View
          style={{
            backgroundColor: item.color,
            flex: 1,
          }}
        />
      ),
      onPress: onPressPagination,
    };
  }, [data.length]);
  return (
    <>
      <CarouselComp
        vertical={false}
        loop
        ref={ref}
        width={width - 16}
        height={CAROUSEL_ITEM_WRAPPER_HEIGHT}
        data={data}
        scrollAnimationDuration={500}
        pagingEnabled
        snapEnabled
        autoPlay={false}
        onProgressChange={progress}
        mode="parallax"
        modeConfig={modeConfig}
        renderItem={renderItem}
      />
      <Pagination.Basic<{ color: string }> progress={progress} size={12} {...pagination} />
    </>
  );
}

const modeConfig = {
  parallaxScrollingScale: 1,
  parallaxScrollingOffset: 5,
};
