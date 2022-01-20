import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  ScrollView,
  DeviceEventEmitter,
  NativeEventEmitter,
  Switch,
  TouchableOpacity,
  Dimensions,
  ToastAndroid,
} from 'react-native';

import {
  BluetoothManager,
  BluetoothTscPrinter,
} from 'react-native-bluetooth-escpos-printer';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import uuid from 'react-native-uuid';

var {height, width} = Dimensions.get('window');
var viewSender = null;
var viewReciver = null;
// const imagePathReciver = `${RNFS.ExternalDirectoryPath}/imageReciver.${imageType}`;

const App = () => {
  const [devices, setDevices] = useState();
  const [pairedDs, setPairedDs] = useState([]);
  const [foundDs, setFoundDs] = useState([]);
  const [bleOpend, setBleOpend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boundAddress, setBoundAddress] = useState('');
  const [debugMsg, setDebugMsg] = useState();
  const [Name, setName] = useState();

  useEffect(() => {
    let listeners = [];
    BluetoothManager.isBluetoothEnabled().then(
      enabled => {
        setBleOpend(Boolean(enabled));
        setLoading(false);
      },
      err => {
        err;
      },
    );

    if (Platform.OS === 'ios') {
      let bluetoothManagerEmitter = new NativeEventEmitter(BluetoothManager);
      listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
          rsp => {
            _deviceAlreadPaired(rsp);
          },
        ),
      );
      listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_FOUND,
          rsp => {
            _deviceFoundEvent(rsp);
          },
        ),
      );
      listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_CONNECTION_LOST,
          () => {
            setName('');
            setBoundAddress('');
          },
        ),
      );
    } else if (Platform.OS === 'android') {
      listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
          rsp => {
            _deviceAlreadPaired(rsp);
          },
        ),
      );
      listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_FOUND,
          rsp => {
            _deviceFoundEvent(rsp);
          },
        ),
      );
      listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_CONNECTION_LOST,
          () => {
            setName('');
            setBoundAddress('');
          },
        ),
      );
      listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_BLUETOOTH_NOT_SUPPORT,
          () => {
            ToastAndroid.show(
              'Device Not Support Bluetooth !',
              ToastAndroid.LONG,
            );
          },
        ),
      );
    }
  }, [_deviceAlreadPaired, _deviceFoundEvent]);

  const _deviceAlreadPaired = rsp => {
    var ds = null;
    if (typeof rsp.devices === 'object') {
      ds = rsp.devices;
    } else {
      try {
        ds = JSON.parse(rsp.devices);
      } catch (e) {}
    }
    if (ds && ds.length) {
      let pared = pairedDs;
      pared = pared.concat(ds || []);
      setPairedDs(pared);
    }
  };

  const _deviceFoundEvent = rsp => {
    //alert(JSON.stringify(rsp))
    var r = null;
    try {
      if (typeof rsp.device === 'object') {
        r = rsp.device;
      } else {
        r = JSON.parse(rsp.device);
      }
    } catch (e) {
      //alert(e.message);
      //ignore
    }
    //alert('f')
    if (r) {
      let found = foundDs || [];
      if (found.findIndex) {
        let duplicated = found.findIndex(function (x) {
          return x.address == r.address;
        });
        //CHECK DEPLICATED HERE...
        if (duplicated == -1) {
          found.push(r);
          setFoundDs(found);
        }
      }
    }
  };

  const _renderRow = rows => {
    let items = [];
    for (let i in rows) {
      let row = rows[i];
      if (row.address) {
        items.push(
          <TouchableOpacity
            key={new Date().getTime() + i}
            style={styles.wtf}
            onPress={() => {
              setLoading(true);
              BluetoothManager.connect(row.address).then(
                s => {
                  setLoading(false);
                  setBoundAddress(row.address);
                  setName(row.name || 'UNKNOWN');
                },
                e => {
                  setLoading(false);
                  alert(e);
                },
              );
            }}>
            <Text style={styles.name}>{row.name || 'UNKNOWN'}</Text>
            <Text style={styles.address}>{row.address}</Text>
          </TouchableOpacity>,
        );
      }
    }
    return items;
  };

  const convertImg = () => {
    let imageType = 'jpg';
    let imagePath =
      Platform.OS === 'ios'
        ? `${RNFS.CachesDirectoryPath}/${uuid.v4()}.${imageType}`
        : `${RNFS.ExternalDirectoryPath}/image.${imageType}`;

    viewSender
      .capture()
      .then(uri => {
        RNFS.moveFile(uri, imagePath).then(success => {
          // viewReciver
          //   .capture()
          //   .then(uri2 => {
          //     RNFS.moveFile(uri2, imagePathReciver).then(successmove => {
          //       onPrint(imagePath, imagePathReciver);
          //     });
          //   })
          //   .catch(err => {
          //     console.log(err.message);
          //   });
          onPrint(imagePath);
        });
      })
      .catch(err => {
        console.log(err.message);
      });
  };

  const onPrint = async imagePath => {
    let base64Img = await RNFS.readFile(imagePath, 'base64').then(res => {
      return res;
    });
    // console.log(base64Img);
    // let base64ImgReciver = await RNFS.readFile(imagePathReciver, 'base64').then(
    //   res => {
    //     return res;
    //   },
    // );
    let options = {
      width: 180,
      height: 150,
      gap: 20,
      direction: BluetoothTscPrinter.DIRECTION.FORWARD,
      reference: [0, 0],
      tear: BluetoothTscPrinter.TEAR.ON,
      sound: 0,
      image: [
        {
          x: 70,
          y: 40,
          mode: BluetoothTscPrinter.BITMAP_MODE.OVERWRITE,
          width: 710,
          image: base64Img,
        },
        // {
        //   x: 20,
        //   y: 700,
        //   mode: BluetoothTscPrinter.BITMAP_MODE.OVERWRITE,
        //   width: 400,
        //   image: base64ImgReciver,
        // },
      ],
    };
    try {
      // console.log(options)
      await BluetoothTscPrinter.printLabel(options);
    } catch (e) {
      alert(e.message || 'ERROR');
    }
  };

  const _scan = () => {
    setLoading(true);
    BluetoothManager.scanDevices().then(
      s => {
        var ss = s;
        var found = ss.found;
        try {
          found = JSON.parse(found); //@FIX_it: the parse action too weired..
        } catch (e) {
          //ignore
        }
        var fds = foundDs;
        if (found && found.length) {
          fds = found;
        }
        setFoundDs(fds);
        setLoading(false);
      },
      er => {
        setLoading(false);
        // alert('error' + JSON.stringify(er));
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text>{debugMsg}</Text>
        {/* <Text>{JSON.stringify(this.state, null, 3)}</Text> */}
        <Text style={styles.title}>
          Blutooth Opended:{bleOpend ? 'true' : 'false'}{' '}
          <Text>Open BLE Before Scanning</Text>{' '}
        </Text>
        <View>
          <Switch
            value={bleOpend}
            onValueChange={v => {
              setLoading(true);
              if (!v) {
                BluetoothManager.disableBluetooth().then(
                  () => {
                    setBleOpend(false);
                    setLoading(false);
                    setFoundDs([]);
                    setPairedDs([]);
                  },
                  err => {
                    alert(err);
                  },
                );
              } else {
                BluetoothManager.enableBluetooth().then(
                  r => {
                    var paired = [];
                    if (r && r.length > 0) {
                      for (var i = 0; i < r.length; i++) {
                        try {
                          paired.push(JSON.parse(r[i]));
                        } catch (e) {
                          //ignore
                        }
                      }
                    }
                    setBleOpend(true);
                    setLoading(false);
                    setPairedDs(paired);
                  },
                  err => {
                    setLoading(false);
                    alert(err);
                  },
                );
              }
            }}
          />
          <Button
            disabled={loading || !bleOpend}
            onPress={() => {
              _scan();
            }}
            title="Scan"
          />
        </View>
        <Text style={styles.title}>
          Connected:
          <Text style={styles.colorText}>{!Name ? 'No Devices' : Name}</Text>
        </Text>
        <Text style={styles.title}>Found(tap to connect):</Text>
        {loading ? <ActivityIndicator animating={true} /> : null}
        <View style={styles.rowList}>{_renderRow(foundDs)}</View>
        <Text style={styles.title}>Paired:</Text>
        {loading ? <ActivityIndicator animating={true} /> : null}
        <View style={styles.rowList}>
          {_renderRow(pairedDs)}
          <Text>{''}</Text>

          <Button
            disabled={loading || boundAddress.length <= 0}
            title="Print FOLLOWING Image"
            onPress={() => {
              convertImg();
            }}
          />
          <View>
            <ViewShot
              ref={viewsender => {
                viewSender = viewsender;
              }}
              style={styles.viewshot}>
              <View style={styles.contents}>
                <View style={styles.viewShot}>
                  <Text style={styles.dataText}>ผู้ส่ง</Text>
                  <Text style={styles.dataText}>บริษัท ทดสอบ1 จำกัด</Text>
                  <Text style={styles.dataText}>
                    12/11 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ
                  </Text>
                  <Text style={styles.dataText}>
                    จังหวัดกรุงเทพมหานคร{' '}
                    <Text style={styles.postCode}>11111</Text>
                  </Text>
                  <Text style={styles.dataText}>โทร 01-2345678</Text>
                </View>
                <View style={styles.reciver}>
                  <View style={styles.viewShot}>
                    <Text style={styles.dataText}>ผู้รับ</Text>
                    <Text style={styles.dataText}>บริษัท ทดสอบ2 จำกัด</Text>
                    <Text style={styles.dataText}>
                      13/11 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ
                    </Text>
                    <Text style={styles.dataText}>
                      จังหวัดกรุงเทพมหานคร{' '}
                      <Text style={styles.postCode}>11111</Text>
                    </Text>
                    <Text style={styles.dataText}>โทร 01-2345678</Text>
                  </View>
                </View>
              </View>
            </ViewShot>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  colorText: {
    color: 'blue',
  },
  rowList: {
    flex: 1,
    flexDirection: 'column',
  },
  title: {
    width: width,
    backgroundColor: '#eee',
    color: '#232323',
    paddingLeft: 8,
    paddingVertical: 4,
    textAlign: 'left',
  },
  wtf: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    textAlign: 'left',
  },
  address: {
    flex: 1,
    textAlign: 'right',
  },
  viewShot: {},
  viewshot: {
    alignSelf: 'center',
    // transform: [{rotate: '90deg'}],
    marginTop: 10,
    width: 300,
    height: 500,
    backgroundColor: '#fff',
  },
  contents: {
    transform: [{rotate: '90deg'}],
    width: 490,
    height: 300,
    marginTop: 100,
    alignSelf: 'center',
  },
  sender: {
    // alignSelf: 'flex-end',
    // flex: 1,
    // marginTop: 70,
    // alignSelf:'flex-end',
    // marginHorizontal: 10,
    // transform: [{rotate: '90deg'}],
    // position:'absolute',
    // backgroundColor:'#ffd'
    // width: 150,
  },
  reciver: {
    // width: 430,
    alignSelf: 'flex-end',
    // alignItems:'stretch',
    // marginHorizontal: 10,
    // flex: 1,
    marginTop: 60,
    marginRight: 20,
    // alignItems: 'flex-end',
    // transform: [{rotate: '90deg'}],
    // position:'absolute',
    // backgroundColor:'#ffd',

    // width: 150,
  },
  dataText: {
    color: 'black',
    fontFamily: 'Sarabun-ExtraBold',
    fontSize: 12,
    // fontWeight:'bold'
    // transform:[{rotate:'90deg'}],
    // position:'absolute',
    // alignSelf:'flex-end',
    // marginTop:20
  },
  postCode: {
    fontSize: 14,
  },
});

export default App;
