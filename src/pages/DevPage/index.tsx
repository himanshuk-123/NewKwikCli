import { View, Text, Image, StyleSheet, Button } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import useDBServices from '../../db';
import { LocalStorage } from '../../Utils';
import apiCallService from '@src/services/apiCallService';
import RNFetchBlob from 'rn-fetch-blob';
import * as FileSystem from 'expo-file-system';
import { ResizeMode, Video } from 'expo-av';
// import Slider from '@react-native-community/slider';

const DevPage = () => {
	const [images, setImages] = useState([]);
	const videoRef = useRef<Video>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackPosition, setPlaybackPosition] = useState(0);
	const [playbackDuration, setPlaybackDuration] = useState(0);
	// const { retrieveImages } = useDBServices();

	// useEffect(() => {
	// 	(async () => {
	// 		console.log('object');
	// 		await retrieveImages((data: any) => {
	// 			setImages(data);
	// 		});
	// 	})();
	// }, []);

	useEffect(() => {
		(async () => {
			// const { postWithFormData } = apiCallService();
			// const str =
			// 	'file:///data/user/0/host.exp.exponent/files/photos/1723962108825.jpg';
			// const b64 =
			// 	(await FileSystem.readAsStringAsync(str, {
			// 		encoding: FileSystem.EncodingType.Base64,
			// 	})) || '';
			// const formData = new FormData();
			// try {
			// 	formData.append('file', new Blob([b64]), '123123.jpg');
			// 	const resp = await postWithFormData({
			// 		service: `/App/webservice/${'DocumentUpload'}`,
			// 		body: formData,
			// 	});
			// } catch (error) {
			// 	console.log('ERROR: ', error);
			// }
			// https: console.log(
			// 	'file:///data/user/0/host.exp.exponent/files/photos/1723923964015.jpg'
			// );
			// const data = await LocalStorage.get('sync_queue');
			// const ids = data.map((item: any) => item.id);
			// console.log(ids);
			// await LocalStorage.clear();
			// if (videoRef && videoRef.current) {
			// 	await videoRef.current.playAsync();
			// }
		})();
	}, []);

	const onPlaybackStatusUpdate = (status: any) => {
		setPlaybackPosition(status.positionMillis);
		setPlaybackDuration(status.durationMillis);
		setIsPlaying(status.isPlaying);
	};

	const handlePlayPause = () => {
		if (videoRef && videoRef.current) {
			if (isPlaying) {
				videoRef.current.pauseAsync();
			} else {
				videoRef.current.playAsync();
			}
		}
	};

	const handleSliderChange = (value: any) => {
		videoRef?.current?.setPositionAsync(value);
	};

	return (
		<View
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				height: '100%',
				gap: 10,
			}}>
			{/* {images.map((item: any) => ( */}
			{/* <Image
				source={{
					uri: 'file:///data/user/0/host.exp.exponent/files/photos/1723923964015.jpg',
				}}
				style={StyleSheet.absoluteFillObject}
			/> */}
			<Video
				ref={videoRef}
				useNativeControls={false} // Disable default controls
				resizeMode={ResizeMode.CONTAIN}
				usePoster
				source={{
					uri: 'file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540jaiswal-siddhant%252FvehicleApp/Camera/055b4a93-e203-4b2e-b5be-9f246ee37cc0.mp4',
				}}
				isMuted
				style={StyleSheet.absoluteFillObject}
				onPlaybackStatusUpdate={onPlaybackStatusUpdate}
			/>
			<View style={styles.controls}>
				<Button
					title={isPlaying ? 'Pause' : 'Play'}
					onPress={handlePlayPause}
				/>
				{/* <Slider
					style={styles.slider}
					value={playbackPosition}
					minimumValue={0}
					maximumValue={playbackDuration}
					onValueChange={handleSliderChange}
				/> */}
			</View>
			{/* ))} */}
		</View>
	);
};

export default DevPage;
const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	video: {
		width: '100%',
		height: 300,
	},
	controls: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		marginVertical: 20,
	},
	slider: {
		width: 200,
		height: 40,
	},
});
