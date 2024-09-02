const { OTP } = require('rutsotp');
const fetch = require('node-fetch'); // เพิ่มการนำเข้า fetch

const uid = "gate";
const secret = "x00irMSat$lP";

const getLibraryDataAPI = async (id) => {
  try {
    const otp = await OTP(secret);
    const response = await fetch(`https://api.rmutsv.ac.th/library/getdata/${id}/${uid}/${otp}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching library data:', error);
    throw error;
  }
}

(async () => {
  try {
    const data = await getLibraryDataAPI("164404140049");
    // const data = await getLibraryDataAPI("authapon.k");
    console.log(`status:    ${data.status}`);
    console.log(`type:      ${data.type}`);
    console.log(`ชื่อ:        ${data.firstname}`);
    console.log(`สกุล:       ${data.lastname}`);
    console.log(`รหัสคณะ:    ${data.faccode}`);
    console.log(`ชื่อคณะ:     ${data.facname}`);
    console.log(`รหัสสาขา:   ${data.depcode}`);
    console.log(`ชื่อสาขา:    ${data.depname}`);
    console.log(`รหัสหลักสูตร: ${data.seccode}`);
    console.log(`ชื่อหลักสูตร:  ${data.secname}`);
    console.log(`email:     ${data.email}`);
  } catch (e) {
    console.error('Error:', e);
  }
})();