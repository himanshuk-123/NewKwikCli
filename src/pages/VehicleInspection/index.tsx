import { StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import { Button, Input, Text, VStack } from '@gluestack-ui/themed';
import SelectDropdown from 'react-native-select-dropdown';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InputField } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';

type Props = {};

const VehicleInspection = ({ route }: { route: any }) => {
	const { carId } = route.params;
	const navigation = useNavigation();

	const [vehicleDetails, setVehicleDetails] = useState<any>({
		fuelType: '',
		make: '',
		model: '',
	});

	const vehicleFuelType = ['Petrol', 'Diesel', 'CNG', 'Electric'];
	const MakeType = ['Maruti', 'Hyundai', 'Mahindra', 'Tata'];
	const ModelType = ['WagonR', 'Swift', 'Baleno', 'Ertiga'];

	const HandleSelect = (param: string, value: string) => {
		setVehicleDetails({
			...vehicleDetails,
			[param]: value,
		});
	};

	return (
		<View
			style={{
				display: 'flex',
				alignItems: 'center',
				paddingTop: 20,
				height: '100%',
			}}>
			<Text fontSize={'$xl'} fontWeight={'$bold'}>
				Select Vehicle Details
			</Text>
			<Text fontSize={'$md'} fontWeight={'$semibold'}>
				Registration no. {carId}
			</Text>

			<VStack space='lg' pt={'$5'} w={'80%'}>
				<Input>
					<InputField
						placeholder='Registration Number'
						value={carId}
						readOnly
					/>
				</Input>

				<SelectDropdown
					data={vehicleFuelType}
					onSelect={(selectedItem, index) => {
						HandleSelect('fuelType', selectedItem);
					}}
					renderButton={(selectedItem, isOpened) => {
						return (
							<View style={styles.dropdownButtonStyle}>
								<Text style={styles.dropdownButtonTxtStyle}>
									{vehicleDetails.fuelType ||
										'Vehicle Fuel Type'}
								</Text>
								<MaterialCommunityIcons
									size={24}
									name={'chevron-down'}
								/>
							</View>
						);
					}}
					renderItem={(item, index, isSelected) => {
						return (
							<View
								style={{
									...styles.dropdownItemStyle,
									...(isSelected && {
										backgroundColor: '#D2D9DF',
									}),
								}}>
								<Text style={styles.dropdownItemTxtStyle}>
									{item}
								</Text>
							</View>
						);
					}}
					dropdownStyle={styles.dropdownMenuStyle}
				/>

				<SelectDropdown
					data={MakeType}
					onSelect={(selectedItem, index) => {
						HandleSelect('make', selectedItem);
					}}
					renderButton={(selectedItem, isOpened) => {
						return (
							<View style={styles.dropdownButtonStyle}>
								<Text style={styles.dropdownButtonTxtStyle}>
									{vehicleDetails.make || 'Make'}
								</Text>
								<MaterialCommunityIcons
									size={24}
									name={'chevron-down'}
								/>
							</View>
						);
					}}
					renderItem={(item, index, isSelected) => {
						return (
							<View
								style={{
									...styles.dropdownItemStyle,
									...(isSelected && {
										backgroundColor: '#D2D9DF',
									}),
								}}>
								<Text style={styles.dropdownItemTxtStyle}>
									{item}
								</Text>
							</View>
						);
					}}
					dropdownStyle={styles.dropdownMenuStyle}
				/>

				<SelectDropdown
					data={ModelType}
					onSelect={(selectedItem, index) => {
						HandleSelect('model', selectedItem);
					}}
					renderButton={(selectedItem, isOpened) => {
						return (
							<View style={styles.dropdownButtonStyle}>
								<Text style={styles.dropdownButtonTxtStyle}>
									{vehicleDetails.model || 'Model'}
								</Text>
								<MaterialCommunityIcons
									size={24}
									name={'chevron-down'}
								/>
							</View>
						);
					}}
					renderItem={(item, index, isSelected) => {
						return (
							<View
								style={{
									...styles.dropdownItemStyle,
									...(isSelected && {
										backgroundColor: '#D2D9DF',
									}),
								}}>
								<Text style={styles.dropdownItemTxtStyle}>
									{item}
								</Text>
							</View>
						);
					}}
					dropdownStyle={styles.dropdownMenuStyle}
				/>
			</VStack>

			<Button
				style={{
					width: '80%',
					position: 'absolute',
					bottom: 40,
					marginTop: 20,
				}}
				onPress={() =>
					// @ts-ignore
					navigation.navigate('VehicleDetails', {
						carId,
					})
				}>
				<Text color='white'>Next</Text>
			</Button>
		</View>
	);
};

export default VehicleInspection;
const styles = StyleSheet.create({
	dropdownButtonStyle: {
		width: '100%',
		height: 50,
		backgroundColor: '#E9ECEF',
		borderRadius: 12,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 12,
	},
	dropdownButtonTxtStyle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '500',
		color: '#151E26',
	},
	dropdownButtonArrowStyle: {
		fontSize: 28,
	},
	dropdownButtonIconStyle: {
		fontSize: 28,
		marginRight: 8,
	},
	dropdownMenuStyle: {
		backgroundColor: '#E9ECEF',
		borderRadius: 8,
	},
	dropdownItemStyle: {
		width: '100%',
		flexDirection: 'row',
		paddingHorizontal: 12,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 8,
	},
	dropdownItemTxtStyle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '500',
		color: '#151E26',
	},
	dropdownItemIconStyle: {
		fontSize: 28,
		marginRight: 8,
	},
});
