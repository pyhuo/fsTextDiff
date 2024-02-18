import axios, { AxiosResponse, AxiosError } from 'axios';
//@ts-nocheck
import { bitable, UIBuilder } from "@lark-base-open/js-sdk";

interface MyData {
  // 定义您的POST请求数据结构
  original: string;
  modified: string;
}
interface Cell {
  text: string;
}

async function sendPostRequest(url: string, data: MyData): Promise<string> {
  try {
    const response: AxiosResponse = await axios.post(url, data);
    // 处理响应数据
    console.log('POST请求成功:', response.data);
    return response.data.data.link;
  } catch (error) {
    // 处理错误
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // 请求已发送，但响应状态码不在 2xx 范围内
      console.error('POST请求失败，响应状态码:', axiosError.response.status);
      console.error('响应数据:', axiosError.response.data);
    } else {
      // 请求未能发送到服务器
      console.error('POST请求发送失败:', axiosError.message);
    }
    throw error;
  }
}

async function getSelectedTableAndView(): Promise<{ table: any, view: any }> {
  const selection = await bitable.base.getSelection();
  const table = await bitable.base.getActiveTable();
  const view = await table.getViewById(selection?.viewId!);
  return { table, view };
}

async function getRecordIdsAndFieldIds(view: any): Promise<{ recordIds: string[], fieldIds: string[] }> {
  const recordIds = await view.getVisibleRecordIdList();
  const fieldIds = await view.getVisibleFieldIdList();
  return { recordIds, fieldIds };
}

async function getCellValue(table: any, fieldId: string, recordId: string): Promise<string> {
  const recordValue = await table.getRecordById(recordId);
  console.log("recordValue:", recordValue);
  const cellValue = recordValue.fields[fieldId];
  const concatenatedText = cellValue.map((cell: Cell) => cell.text).join("");
  //将每个元素的 text 属性连接起来
  return concatenatedText;
  // return cellValue.text;
}

function concatenateStrings(...strings: string[]): string {
  return strings.join('');
}

export default async function main(uiBuilder: UIBuilder) {
  uiBuilder.markdown(`
  ## 对比选中的两列
  * step1: 选中A列
  * step2: 选中B列
  * step3: 点击按钮
  `);

  uiBuilder.form((form) => ({
    formItems: [
      form.inputNumber('srcIdx', { label: '输入(原数据)所在列(第一列0)', defaultValue: 1 }),
      form.inputNumber('targetIdx', { label: '输入(对比数据)所在列(第一列0)', defaultValue: 2 }),
      form.inputNumber('diffIdx', { label: '输入对比结果链接写入列(第一列0)', defaultValue: 3 }),
    ],
    buttons: ['对比'],
  }), async ({ key, values }) => {
    const { srcIdx, targetIdx, diffIdx } = values;
    uiBuilder.markdown(`你点击了**${key}**按钮`);
    if (typeof srcIdx !== 'number' || typeof targetIdx !== 'number' || typeof diffIdx !== 'number') {
      throw new Error('索引值必须是数字');
    }

    try {
      const { table, view } = await getSelectedTableAndView();
      const { recordIds, fieldIds } = await getRecordIdsAndFieldIds(view);

      // 假设 srcFieldId 和 targetFieldId 是 fieldIds 中的第二个和第三个字段
      const srcFieldId = fieldIds[srcIdx];
      const targetFieldId = fieldIds[targetIdx];
      const diffFieldId = fieldIds[diffIdx];

      for (const recordId of recordIds) {
        const srcCellVal = await getCellValue(table, srcFieldId, recordId);
        const targetCellVal = await getCellValue(table, targetFieldId, recordId);
        // const data = concatenateStrings(srcCellVal, targetCellVal);
        // 调用示例
        const postData: MyData = {
          original: srcCellVal,
          modified: targetCellVal
        };
        // console.log("original:", srcCellVal);
        // console.log("modified:", targetCellVal);

        const postUrl: string = 'https://fs.pyhuo.top/api/v1/diff/';

        const diffLink = await sendPostRequest(postUrl, postData);
        // 写入link到指定的列
        // 设置某个多行文本类型的字段
        const res = await table.setCellValue(diffFieldId, recordId, [
          {
            type: 'url',
            text: '对比结果',
            link: diffLink,
          }
        ])
      }
    } catch (error) {
      console.error("发生错误:", error);
    }
  });
}
