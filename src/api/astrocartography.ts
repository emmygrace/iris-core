import { AxiosInstance } from 'axios';

import type {
  PlanetaryLinesRequest,
  PlanetaryLinesResponse,
  RelocationRequest,
  RelocationResponse,
} from '../types/astrocartography_types';

export interface AstrocartographyApi {
  lines(request: PlanetaryLinesRequest): Promise<PlanetaryLinesResponse>;
  relocate(request: RelocationRequest): Promise<RelocationResponse>;
}

export function createAstrocartographyApi(axios: AxiosInstance): AstrocartographyApi {
  return {
    async lines(request) {
      const response = await axios.post<PlanetaryLinesResponse>('/astrocartography/lines', request);
      return response.data;
    },
    async relocate(request) {
      const response = await axios.post<RelocationResponse>('/astrocartography/relocate', request);
      return response.data;
    },
  };
}

