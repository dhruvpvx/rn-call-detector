import {Button, PermissionsAndroid, StyleSheet, Text, View} from 'react-native';
import React, {useEffect} from 'react';
import CallDetectorManager from 'react-native-call-detection';
import axios from 'axios';
import notifee, {AuthorizationStatus} from '@notifee/react-native';

// TODO: Fix method structure
// TODO: Add App Icon
// TODO: Add Permssion status and request
// TODO: Handle In Kill State
// TODO: Add Option to save suggested name from notification
// TODO: Remove @notifee and CallDetectorManager and use custom implementation

const AUTH_ID = '';

const checkIfSpam = (user: any) => {
  const altNameSpam = user?.altName
    ? user?.altName?.toLowerCase()?.includes('spam')
    : false;
  const spamScore = user?.spamInfo?.spamScore !== undefined;
  return altNameSpam || spamScore;
};

type Address = {
  area: string;
  city: string;
  countryCode: string;
  timeZone: string;
  type: string;
};

const getAdress = (user: any) => {
  const address: Address = user.addresses[0];
  const check = key => (address[key] ? `${address[key] + ', '}` : '');
  return `${check('area')} ${check('city')} ${check('countryCode')}`;
};

const App = () => {
  const requestPermissions = async () => {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      ]);
      if (
        granted['android.permission.READ_PHONE_STATE'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.READ_CALL_LOG'] ===
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log('Permissions granted');
        // Start call detection
      } else {
        console.log('Permissions denied');
      }
    } catch (error) {
      console.log('Error requesting permissions:', error);
    }
  };

  async function onDisplayNotification(
    name: string,
    isSpam: boolean,
    address?: string,
  ) {
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });

    await notifee.displayNotification({
      title: name + (isSpam ? ' (Spam)' : ''),
      body: address,
      android: {
        channelId,
      },
    });
  }

  useEffect(() => {
    notifee.onBackgroundEvent(({type, detail}) => {
      console.log('Background event received: ', {type, detail});
    });
  }, []);

  const handleSearch = async (number: number) => {
    try {
      // let pn = parsePhoneNumber(search_data.number.toString(), {
      //   regionCode: search_data.countryCode,
      // });
      const response = await axios.get(
        'https://search5-noneu.truecaller.com/v2/search',
        {
          params: {
            q: number,
            type: 4,
            locAddr: '',
            placement: 'SEARCHRESULTS,HISTORY,DETAILS',
            encoding: 'json',
          },
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'accept-encoding': 'gzip',
            'user-agent': 'Truecaller/11.75.5 (Android;10)',
            Authorization: `Bearer ${AUTH_ID}`,
          },
        },
      );
      const [user] = response.data.data;
      onDisplayNotification(user.name, checkIfSpam(user), getAdress(user));
    } catch (error) {
      console.log('Error:', error);
    }
  };

  async function checkNotificationPermission() {
    const settings = await notifee.requestPermission();

    if (settings.authorizationStatus == AuthorizationStatus.AUTHORIZED) {
      console.log('Notification permissions has been authorized');
    } else if (settings.authorizationStatus == AuthorizationStatus.DENIED) {
      console.log('Notification permissions has been denied');
    }
  }

  useEffect(() => {
    requestPermissions();
    checkNotificationPermission();
    const callDetector = new CallDetectorManager(
      (event, phoneNumber) => {
        if (event === 'Incoming') {
          handleSearch(phoneNumber);
        }
      },
      true,
      () => {
        console.log('Permissions granted');
      },
    );
    return () => {
      callDetector.dispose();
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text>Okay</Text>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({});
